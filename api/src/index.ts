import { ICustomState, IEmailVerification } from './types';
import koa from 'koa';
import koaBody from 'koa-body';
import middleware from './middleware'
import Router from 'koa-router';
import log4js from 'log4js';
import conf from '../conf';
import crypto from 'crypto';
import { User, EmailVerification, Portrait } from './models';
import jwt from 'jsonwebtoken';
import cors from 'koa-cors';
import nodemailer from 'nodemailer';
import uuid from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import util from 'util';

const readFile = util.promisify(fs.readFile);

const DEFAULT_EXPIRE_TIME = '24h';
const DEFAULT_COOKIE_EXPIRE_TIME = 1000*3600*24;

const app = new koa();
const router = new Router();

app.use(cors({credentials: true}));
app.use(koaBody({multipart:true}));
middleware(app);

app.use(async (ctx:koa.ParameterizedContext<any, {}>, next:()=>Promise<any>)=> {

  await next();
});

async function signToken (ctx:koa.ParameterizedContext<ICustomState, {}>, next: ()=>Promise<any>) {
  const {user} = ctx.state;
  log4js.getLogger().info('signed new token');
  // sign token
  const token = jwt.sign({
    _id: user._id,
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

router.get('/', async (ctx:koa.ParameterizedContext<any, {}>)=> {
  ctx.body={message:'OK'};
})

const getCurrentUser =  async (ctx:koa.ParameterizedContext<ICustomState, {}>, next:()=>Promise<any>)=> {
  const user = ctx.state.user;
  ctx.body = {message:'OK', user,};
  if (user) {
    const now = Math.floor(Date.now() / 1000);
    const eta = ctx.state.user.exp - now;
    ctx.body.eta = eta;
    if (eta >= 0 && eta <= 360 || ctx.state.forceRefreshToken) {
      await next();
    }
  }
};

router.get('/api/user/current',
getCurrentUser,
signToken);

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

router.get('/api/user/:id/protrait/:size',
  async (ctx:koa.ParameterizedContext<any, {}>, next)=> {
    let {id} = ctx.params;
    if (id === 'current') {
      id = ctx.state.user._id;
    }
    const {size} = ctx.params;
    const portraitGroup = await Portrait.findOne({user:id}).exec();
    if(!portraitGroup || !portraitGroup[size]) {
      ctx.throw(404);
    }
    ctx.type = 'image/jpeg'
    ctx.body = portraitGroup[size];
  }
);

router.put('/api/user/:id/protrait',
  async (ctx:koa.ParameterizedContext<ICustomState, {}>, next)=> {
    if (ctx.state.user._id === ctx.params.id || ctx.state.user.groups.indexOf('administrators') >= 0) {
      await next();
    } else {
      ctx.throw(401);
    }
  },
  async (ctx:koa.ParameterizedContext<any, {}>, next)=> {
    const {id} = ctx.params;
    const user = User.findById(id).exec();
    if (!user) {
      ctx.throw(404);
    }

    const {file} = ctx.request.files;
    if (!file || !/^image/.test(file.type)) {
      ctx.throw(400);
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
const sendVerificationEmail = async (ctx:koa.ParameterizedContext<any, {}>, next)=> {
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
    subject: conf.mail.subject,
    html: conf.mail.htmlTemplate
          .replace(/{%verificationLink%}/g, `${conf.serverAddress}/emailVerification/${token}`)
          .replace(/{%validateUntil%}/g,validateUntil.toLocaleString()),
  });
  console.log("Message sent: %s", info.messageId);
  } catch (error) {
    ctx.throw('failed sending verfication email', 500);
  }
  await next();
}

const cleanVericicationEmail = async (ctx:koa.ParameterizedContext<any, {}>, next)=> {
  const response = await EmailVerification.deleteMany({validateUntil: {$lt: new Date()}}).exec();
  // console.debug(response);
}

/**
 * register new user
 */
router.post('/api/user', async (ctx:koa.ParameterizedContext<any, {}>, next)=> {
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
router.post('/api/user/emailVerification', async (ctx:koa.ParameterizedContext<any, {}>, next)=>{
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
router.get('/api/emailVerification/:token', async (ctx:koa.ParameterizedContext<ICustomState, {}>, next)=> {
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
 * modify user 
 */
router.put('/api/user/:id', async (ctx:koa.ParameterizedContext<ICustomState, {}>, next)=> {
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
    await next();
  } else {
    ctx.throw(401, `not a admin`);
  }
}, async (ctx:koa.ParameterizedContext<ICustomState, {}>, next)=> {
  // change information
  // console.warn(ctx.request.body);
  const {id} = ctx.params;
  ctx.request.body.updatedAt = new Date();
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

/**
 * login
 */
router.post('/api/session', async (ctx:koa.ParameterizedContext<any, {}>)=> {
  const {
    email,
    password,
  } = ctx.request.body;

  const user = await User.findOne({email}).exec();
  if(!user) {
    ctx.throw(404, 'email or password incorrect');
  }
  
  const {passwordHash, passwordSalt} = user;
  const passwordHash2 = crypto.createHmac('sha256', conf.secret.HMAC_KEY).update(password+passwordSalt).digest().toString('base64');
  if(passwordHash === passwordHash2) {
    user.save();

    const token = jwt.sign({
      _id:user._id,
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
router.delete('/api/session',  async (ctx:koa.ParameterizedContext<any, {}>)=> {
  ctx.cookies.set('token', '', {domain:conf.domainAddress, maxAge: 1000, overwrite:true});
  ctx.body = {message:'OK'}
})

app.use(router.routes());
app.listen(8000, '0.0.0.0');
log4js.getLogger().info('start listening at 8000');
