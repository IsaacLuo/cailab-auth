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

const app = new koa();
const router = new Router();

app.use(koaBody());
middleware(app);

app.use(async (ctx:koa.ParameterizedContext<any, {}>, next:()=>Promise<any>)=> {

  await next();
});


router.get('/', async (ctx:koa.ParameterizedContext<any, {}>)=> {
  ctx.body={message:'OK'};
})

router.get('/api/user/current', async (ctx:koa.ParameterizedContext<ICustomState, {}>)=> {
  ctx.body = {user: ctx.state}
})

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
    const token = jwt.sign({
      id:user._id,
      fullName: user.name,
      email: user.email,
      groups: user.groups,
    }, 
    conf.secret.jwt.key,
    {expiresIn:'1h'})
    user.save();

    // set token to domain cookie
    ctx.cookies.set(
    'token',
    token,
    {
      domain:conf.domainAddress,
      maxAge: 24*3600*1000,
    });

    ctx.body = {message: `welcome ${user.name}`, id:user._id, token, name:user.name, email:user.email, groups:user.groups};
  } else {
    ctx.throw(404, 'username of password is incorrect');
  }
      
  // var hash=crypto.createHmac('sha1', app_secret).update(args).digest().toString('base64');


  // ctx.response.body = {message:'OK'};
});

app.use(router.routes());
app.listen(8000, '0.0.0.0');
log4js.getLogger().info('start listening at 8000')
