import { ICustomState } from './types';
import koa from 'koa';
import koaBody from 'koa-body';
import middleware from './middleware'
import Router from 'koa-router';
import log4js from 'log4js';
import conf from '../conf';
import crypto from 'crypto';
import {User} from './models';
import jwt from 'jsonwebtoken';
import cors from 'koa-cors';

const DEFAULT_EXPIRE_TIME = '24h';
const DEFAULT_COOKIE_EXPIRE_TIME = 1000*3600*24;

const app = new koa();
const router = new Router();

app.use(cors({credentials: true}));
app.use(koaBody());
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

router.get('/api/user/current', async (ctx:koa.ParameterizedContext<ICustomState, {}>, next:()=>Promise<any>)=> {
  const user = ctx.state.user;
  ctx.body = {message:'OK', user,};
  if (user) {
    const now = Math.floor(Date.now() / 1000);
    const eta = ctx.state.user.exp - now;
    ctx.body.eta = eta;
    if (eta >= 0 && eta <= 360) {
      await next();
    }
  }
},
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

router.post('/api/user', async (ctx:koa.ParameterizedContext<any, {}>)=> {
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
      groups: [],
      createdAt: now,
      updatedAt: now,
      authType: 'local',
      passwordHash,
      passwordSalt,
    });
    await user.save();
    ctx.response.body  = {_id: user._id};
  }

})

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

router.delete('/api/session',  async (ctx:koa.ParameterizedContext<any, {}>)=> {
  ctx.cookies.set('token', '', {domain:conf.domainAddress, maxAge: 1000, overwrite:true});
  ctx.body = {message:'OK'}
})

app.use(router.routes());
app.listen(8000, '0.0.0.0');
log4js.getLogger().info('start listening at 8000');
