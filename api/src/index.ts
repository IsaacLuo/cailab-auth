import { ICustomState, IEmailVerification } from './types';
import koa from 'koa';
import koaBody from 'koa-body';
import middleware from './middleware'
import Router, { IRouterParamContext } from 'koa-router';
import log4js from 'log4js';
import conf from '../conf';
import crypto from 'crypto';
import { User, EmailVerification, Portrait, EmailResetPassword } from './models';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import uuid from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import util from 'util';
import { SchemaTypes } from 'mongoose';


type RouterCtx = koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>>;
type MyMiddleware = Router.IMiddleware<RouterCtx>;
type Next = ()=>Promise<any>;
type MyCtx = koa.ParameterizedContext<ICustomState, IRouterParamContext<ICustomState, {}>, any>;

const readFile = util.promisify(fs.readFile);

const DEFAULT_EXPIRE_TIME = '24h';
const DEFAULT_COOKIE_EXPIRE_TIME = 1000*3600*24;
// const GUEST_ID = '4e7020cb7cac81af7136236b';
const GUEST_ID = '000000000000000000000000';

const app = new koa();
const router = new Router();

app.use( async (ctx, next) => {
  if (/cailab\.org/.test(ctx.request.header.origin)) {
    if (/local\.cailab\.org/.test(ctx.request.header.origin)) {
      ctx.res.setHeader('Access-Control-Allow-Origin', 'http://local.cailab.org:3000');
    } else {
      ctx.res.setHeader('Access-Control-Allow-Origin', ctx.request.header.origin.replace('http://', 'https://'));
    }
    ctx.res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    ctx.res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  await next();
})
app.use(koaBody({multipart:true}));
middleware(app);

function userMust (...args: Array<(ctx:MyCtx, next:Next)=>boolean>) {
  const arg = arguments;
  return async (ctx:MyCtx, next:()=>Promise<any>)=> {
    if (Array.prototype.some.call(arg, f=>f(ctx))) {
      await next();
    } else {
      ctx.throw(401);
    }
  };
}

function beUser (ctx:MyCtx, next:Next) {
  return ctx.state.user && 
    (ctx.state.user.groups.indexOf('users')>=0 || ctx.state.user.groups.indexOf('emma/users')>=0) &&
    (ctx.state.user.groups.indexOf('emma/forbidden')<0);
}

function beAdmin (ctx:MyCtx, next:Next) {
  return ctx.state.user && (ctx.state.user.groups.indexOf('administrators')>=0 || ctx.state.user.groups.indexOf('emma/administrators')>=0);
}

function beGuest (ctx:MyCtx, next:Next) {
  return ctx.state.user === undefined || ctx.state.user._id === GUEST_ID;
}

// app.use(async (ctx:MyCtx, next:Next)=> {
//   await next();
// });

async function signToken (ctx:MyCtx, next:Next) {
  const {user} = ctx.state;
  log4js.getLogger().info('signed new token');
  // sign token
  const token = jwt.sign({
    _id: user._id,
    name: user.name,
    fullName: user.name,
    email: user.email,
    groups: user.groups,
  }, 
  conf.secret.jwt.key,
  {expiresIn:DEFAULT_EXPIRE_TIME})
  // set token to domain cookie
  ctx.cookies.set(
  'token',
  token,
  {
    domain:conf.domainAddress,
    maxAge: DEFAULT_COOKIE_EXPIRE_TIME,
    overwrite: true,
  });
  ctx.body.token = token;
  await next();
}

router.get('/', async (ctx)=> {
  ctx.body={message:'OK', env: process.env.NODE_ENV, sv: conf.secret.mongoDB.url};
})

const getCurrentUser = async (ctx:MyCtx, next:Next) => {
  let user:any;
  user = ctx.state.user;
  if (user) {
    if (ctx.query.full) {
      user = await User.findOne({_id:ctx.state.user._id}).select('groups _id email name createdAt updatedAt authType abbr').exec();
    }
    ctx.body = {message:'OK', user,};
    if (user) {
      const now = Math.floor(Date.now() / 1000);
      const eta = ctx.state.user.exp - now;
      ctx.body.eta = eta;
      if (eta >= 0 && eta <= 360 || ctx.state.forceRefreshToken) {
        await next();
      }
    }
  }
};

router.get('/api/user/current',
getCurrentUser,
signToken);

router.get('/api/user/:id',
async (ctx, next)=> {
  if (beAdmin(ctx,next)) {
    await next();
  } else {
    const user = await User.findById(ctx.params.id).select("_id name groups").exec();
    ctx.body = {message:'OK', user,};
  }
},
async (ctx, next)=> {
  const user = await User.findById(ctx.params.id).select('groups _id email name createdAt updatedAt authType abbr').exec();
  ctx.body = {message:'OK', user,};
},
);

// (ctx:koa.ParameterizedContext<ICustomState, {}>, next:()=>Promise<any>


const m:MyMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.log('catched.....', err);
  }
}

router.get('/api/users',
async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.log('catched.....', err);
  }
},
userMust(beAdmin),
async (ctx, next)=> {
  console.log('get all users');
  const user = ctx.state.user;
  if(user && user.groups.indexOf('administrators') >= 0) {
    const users = await User.find().exec();
    ctx.body = {users};
  } else {
    ctx.throw(401, 'you must be adminitrator');
  }
});

function verifyUserForm (form) :boolean {
    const {
      email,
      password,
    } = form;

    if(!/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(email)) {
      return false;
    }
    if(!(password.length >=8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password))) {
      return false;
    }

    return true;
}

router.get('/api/user/:id/portrait/:size/:filename',
  async (ctx, next) => {
    let {id} = ctx.params;
    if (id === 'current') {
      id = ctx.state.user._id;
    }
    const {size} = ctx.params;

    let svgSize = 64;
    switch(size) {
      case 'xl':
        svgSize=512;
        break;
      case 'l':
        svgSize=256;
        break;
      case 'm':
        svgSize=128;
        break;
      case 's':
        svgSize=64;
        break;
      case 'xs':
        svgSize=32;
        break;
    }

    if (id === GUEST_ID) {
      ctx.body = `<?xml version="1.0"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="${svgSize}" width="${svgSize}">
        <circle cx="${svgSize/2}" cy="${svgSize/2}" r="${svgSize/2-5}" stroke="black" stroke-width="${svgSize===32?1:3}" fill="#42f4ce" />
        <text x="${svgSize/2}" y="${svgSize/2}" text-anchor="middle" alignment-baseline="middle" font-size="${svgSize/2*0.9}px" font-family="sans-serif">G</text>
      </svg> 
      `
      ctx.type = 'image/svg+xml'
      return;
    }

    const portraitGroup = await Portrait.findOne({user:id}).exec();
    if(!portraitGroup || !portraitGroup[size]) {
      const user = await User.findById(id).exec();
      if(!user) {
        ctx.throw(404);
      }
      const name = user.name;

      const abbr = name.split(' ').slice(0,2).map(v=>v[0]).join('').toUpperCase();
      ctx.body = `<?xml version="1.0"?>
      <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="${svgSize}" width="${svgSize}">
        <circle cx="${svgSize/2}" cy="${svgSize/2}" r="${svgSize/2-5}" stroke="black" stroke-width="${svgSize===32?1:3}" fill="#42f4ce" />
        <text x="${svgSize/2}" y="${svgSize/2}" text-anchor="middle" alignment-baseline="middle" font-size="${svgSize/2*0.9}px" font-family="sans-serif">${abbr}</text>
      </svg> 
      `
      ctx.type = 'image/svg+xml'
      return;
    }
    ctx.type = 'image/jpeg'
    ctx.body = portraitGroup[size];
  }
);

router.put('/api/user/:id/portrait',
  async (ctx, next)=> {
    if (ctx.state.user._id === ctx.params.id || ctx.state.user.groups.indexOf('administrators') >= 0) {
      await next();
    } else {
      ctx.throw(401);
    }
  },
  async (ctx, next) => {
    const {id} = ctx.params;
    const user = User.findById(id).exec();
    if (!user) {
      ctx.throw(404);
    }

    const {file} = ctx.request.files;
    if (!file || Array.isArray(file) || !/^image/.test(file.type)) {
      ctx.throw(400);
      return;
    }

    const inputBuffer = await readFile(file.path);

    const sizes = [32, 64, 128, 256, 512];

    const resizedImage = await Promise.all(sizes.map(
      async (size) => await sharp(inputBuffer).resize(size, size).jpeg().toBuffer()
      ));
    const result = await Portrait.updateOne(
      {_id:id},
      {
        _id:id,
        user:id,
        xs: resizedImage[0],
        s: resizedImage[1],
        m: resizedImage[2],
        l: resizedImage[3],
        xl: resizedImage[4],
      },
      {
        upsert:true,
      }
      )
    ctx.body = {message:'OK', result};
  }
);

/**
 * send an email for email address verification
 * @param ctx.state.email email for verification 
 */
const sendVerificationEmail = async (ctx, next) => {
  try {
  // generate a token for email verification
  const {email} = ctx.state;
  const token = uuid.v4();
  const now = new Date();
  const validateUntil = new Date(Date.now()+3600*1000); // 1 hour
  await EmailVerification.create({
    email,
    token,
    createdAt: now,
    validateUntil,
  })
  // send email to the address
  const transporter = nodemailer.createTransport(conf.secret.mail.server);
  const info = await transporter.sendMail({
    from: conf.secret.mail.address,
    to: ctx.state.email,
    subject: conf.mails.verification.subject,
    html: conf.mails.verification.htmlTemplate
          .replace(/{%verificationLink%}/g, `${conf.serverAddress}/emailVerification/${token}`)
          .replace(/{%validateUntil%}/g,validateUntil.toLocaleString()),
  });
  console.log("Message sent: %s", info.messageId);
  } catch (error) {
    ctx.throw('failed sending verfication email', 500);
  }
  await next();
}

/**
 * send an email for password resetting
 * @param ctx.state.email email for verification 
 */
const sendResetPasswordEmail = async (ctx, next) => {
  try {
  // generate a token for email verification
  const user = ctx.state.data;
  const token = uuid.v4();
  const now = new Date();
  const validateUntil = new Date(Date.now()+3600*1000); // 1 hour
  await EmailResetPassword.create({
    userId: user._id,
    userName: user.name,
    email:user.email,
    token,
    createdAt: now,
    validateUntil,
    used: false,
  })
  // send email to the address
  const transporter = nodemailer.createTransport(conf.secret.mail.server);
  const info = await transporter.sendMail({
    from: conf.secret.mail.address,
    to: user.email,
    subject: conf.mails.resetPassword.subject,
    html: conf.mails.resetPassword.htmlTemplate
          .replace(/{%verificationLink%}/g, `${conf.serverAddress}/changePassword/${token}`)
          .replace(/{%validateUntil%}/g,validateUntil.toLocaleString()),
  });
  console.log("Message sent: %s", info.messageId);
  } catch (error) {
    ctx.throw('failed sending verfication email', 500);
  }
  await next();
}

const cleanVericicationEmail = async (ctx, next) => {
  const response = await EmailVerification.deleteMany({validateUntil: {$lt: new Date()}}).exec();
  // console.debug(response);
}

/**
 * register new user
 */
router.post('/api/user', async (ctx, next) => {
  const {
    name,
    email,
    password,
  } = ctx.request.body;

  if (!verifyUserForm({email, password})) {
    ctx.throw(406, 'email or password should meet requirements');
  } else {
    ctx.response.body = {name, email};

    const passwordSalt = Math.random().toString(36).substring(2);
    const passwordHash = crypto.createHmac('sha256', conf.secret.HMAC_KEY).update(password+passwordSalt).digest().toString('base64');
    const userCount = await User.countDocuments({email}).exec();
    if (userCount > 0) {
      ctx.throw(409, {message: `user ${email} exists`});
      return;
    }
    const now = new Date();
    const user = new User({
      email,
      name,
      groups: ['emailNotVerified'],
      createdAt: now,
      updatedAt: now,
      authType: 'local',
      passwordHash,
      passwordSalt,
    });
    await user.save();
    ctx.state.email = email;
    ctx.state.forceRefreshToken = true;
    ctx.state.user = {_id: user._id, email: user.email, name: user.name, groups: user.groups, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+5};
    await next();
  }
},
getCurrentUser,
signToken,
sendVerificationEmail,
cleanVericicationEmail,
);

/**
 * request new email verification
 */
router.post('/api/user/emailVerification', async (ctx, next) =>{
  const user = ctx.state.user;
  if(user.groups.indexOf('emailNotVerified')>=0) {
    ctx.state.email = user.email;
    await next();
    ctx.response.body = {_id: user._id};
  } else {
    ctx.throw('email already verified',405);
  }
}, sendVerificationEmail, cleanVericicationEmail);

/**
 * verify email by sending token in email
 */
router.get('/api/emailVerification/:token', async (ctx, next)=> {
  const {token} = ctx.params;
  const emailVerification = await EmailVerification.findOne({token}).exec();
  if(!emailVerification) {
    ctx.throw(404);
  }
  const now = new Date();
  if (now > emailVerification.validateUntil) {
    ctx.throw(404);
  }
  const user = await User.findOne({email: emailVerification.email}).exec();
  if(!user) {
    ctx.throw(404);    
  }

  const groupIdx = user.groups.indexOf('emailNotVerified');
  if(groupIdx === -1) {
    ctx.throw('email already verified', 410);
  }

  user.groups.splice(groupIdx,1);
  user.updatedAt = now;
  // user.groups[groupIdx] = 'guest';
  await user.save();
  ctx.state.forceRefreshToken = true;
  ctx.state.user = {_id: user._id, email: user.email, name: user.name, groups: user.groups, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+5};
  await next();
}, 
getCurrentUser,
signToken,
cleanVericicationEmail);

/**
 * request new email resetting password
 * @bopdy, {email:}
 */
router.post('/api/user/emailResetPassword',
async (ctx, next)=>{
  const {email} = ctx.request.body;
  const user = await User.findOne({email}).exec();
  ctx.body = {message: 'OK'};
  if (user) {
    // found user, send password resetting email
    ctx.state.data = user;
    console.log(`resetting password of ${user.name}`);
    await next();
  }
}, sendResetPasswordEmail);

/**
 * verify email by sending token in email
 */
router.put('/api/user/password/:token', async (ctx, next)=> {
  const {token} = ctx.params;
  const emailResetPassword = await EmailResetPassword.findOne({token, used: false}).exec();
  if(!emailResetPassword) {
    console.error('no email of resetting password');
    ctx.throw(404);
  }
  const now = new Date();
  if (now > emailResetPassword.validateUntil) {
    console.error('resetting password email expired');
    ctx.throw(404);
  }
  const user = await User.findOne({email: emailResetPassword.email}).exec();
  if(!user) {
    console.error('unable to fine user to modify password');
    ctx.throw(404);
  }

  // set password
  user.passwordSalt = Math.random().toString(36).substring(2);
  // console.log(ctx.request.body.password+user.passwordSalt);
  user.passwordHash = crypto.createHmac('sha256', conf.secret.HMAC_KEY).update(ctx.request.body.password+user.passwordSalt).digest().toString('base64');
  user.updatedAt = now;
  await user.save();
  console.log('user password chagned', user.name);
  emailResetPassword.used = true;
  await emailResetPassword.save();

  ctx.state.forceRefreshToken = true;
  ctx.state.user = {_id: user._id, email: user.email, name: user.name, groups: user.groups, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+5};
  await next();
}, 
getCurrentUser,
signToken,
cleanVericicationEmail);

/** 
 * modify user 
 */
router.put('/api/user/:id',
// userMust(beUser),
async (ctx, next)=> {
  const {id} = ctx.params;
  if (ctx.state.user.groups.indexOf('administrators') >= 0) {
    // administrators, can do any change
    await next();
  } else if (ctx.state.user._id === id) {
    // it's user himself
    // can change name and password
    const newBody:any = {}
    const {name, password} = ctx.request.body;
    if (name) {
      newBody.name = name;
    }
    if (password) {
      newBody.password = password;
    }
    ctx.request.body = newBody;
    console.log(ctx.request.body);
    await next();
  } else {
    ctx.throw(401, `not a admin`);
  }
}, async (ctx, next)=> {
  // change information
  // console.warn(ctx.request.body);
  const {id} = ctx.params;
  ctx.request.body.updatedAt = new Date();
  console.log(ctx.request.body);
  if (ctx.request.body.password) {
    ctx.request.body.passwordSalt = Math.random().toString(36).substring(2);
    ctx.request.body.passwordHash = crypto.createHmac('sha256', conf.secret.HMAC_KEY).update(ctx.request.body.password+ctx.request.body.passwordSalt).digest().toString('base64');
    delete ctx.request.body.password;
  }
  await User.updateOne({_id:id}, ctx.request.body).exec();
  const updatedUser = await User.findOne({_id:id}).exec();
  ctx.body = {message:'OK', changedKeys:Object.keys(ctx.request.body)};
  if (id === ctx.state.user._id) {
    // user changed information, resign token
    ctx.state.user.name = updatedUser.name;
    ctx.state.user.email = updatedUser.email;
    ctx.state.user.groups = updatedUser.groups;
    await next();
  }
}, signToken);

let globalGuestToken:string = undefined;
let globalTokenTime = new Date();
router.post('/api/guestSession', async (ctx)=> {
  if(!globalGuestToken || globalTokenTime.getTime() + 864000 < Date.now()) {
    globalGuestToken = jwt.sign({
        _id: GUEST_ID,
        name: 'guest',
        fullName: 'guest',
        email: '',
        groups: ['guest'],
      }, 
      conf.secret.jwt.key,
      {expiresIn:'30d'})
    globalTokenTime = new Date();
  }

  // set token to domain cookie
    ctx.cookies.set(
    'token',
    globalGuestToken,
    {
      domain:conf.domainAddress,
      maxAge: DEFAULT_COOKIE_EXPIRE_TIME,
    });
    ctx.body = {message: `welcome guest`, _id: GUEST_ID, token:globalGuestToken, name:'guest', email:'', groups:['guest']};
});

/**
 * login
 */
router.post('/api/session', async (ctx)=> {
  const {
    email,
    password,
  } = ctx.request.body;

  const user = await User.findOne({email}).exec();
  if(!user) {
    ctx.throw(404, 'email or password incorrect');
  }
  
  const {passwordHash, passwordSalt} = user;
  if(!passwordHash || !passwordSalt) {
    ctx.throw(406, 'plase reset password');
  }
  const passwordHash2 = crypto.createHmac('sha256', conf.secret.HMAC_KEY).update(password+passwordSalt).digest().toString('base64');
  if(passwordHash === passwordHash2) {
    user.save();

    const token = jwt.sign({
      _id:user._id,
      name: user.name,
      fullName: user.name,
      email: user.email,
      groups: user.groups,
    }, 
    conf.secret.jwt.key,
    {expiresIn:DEFAULT_EXPIRE_TIME})

    // set token to domain cookie
    ctx.cookies.set(
    'token',
    token,
    {
      domain:conf.domainAddress,
      maxAge: DEFAULT_COOKIE_EXPIRE_TIME,
    });

    ctx.body = {message: `welcome ${user.name}`, _id:user._id, token, name:user.name, email:user.email, groups:user.groups};
  } else {
    ctx.throw(404, 'username of password is incorrect');
  }
});

/**
 * logout
 */
router.delete('/api/session',  async (ctx)=> {
  ctx.cookies.set('token', '', {domain:conf.domainAddress, maxAge: 1000, overwrite:true});
  ctx.body = {message:'OK'}
})

app.use(router.routes());
app.listen(8000, '0.0.0.0');
log4js.getLogger().info('start listening at 8000');
