import { ICustomState } from './types';
import koa from 'koa';
import log4js, {Appender, LogLevelFilterAppender} from 'log4js';
import mongoose from 'mongoose';
import conf from '../conf';
import koaJwt from 'koa-jwt';
import jwt from 'jsonwebtoken';

const mainAppender:LogLevelFilterAppender = {
  type: 'logLevelFilter',
  appender: 'default.log',
  level: 'DEBUG',
}

log4js.configure({
  appenders: {
    file: {
      type: 'file',
      filename: 'logs/access.log',
      maxLogSize: 1024,
      backups:3,
    },
    console: {
      type: 'console',
    }
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: 'debug',
    }
  }
});

export default function middleware (app:koa) {
  const logger = log4js.getLogger();

  // 500 middleware
  app.use( async (ctx, next)=> {
    try {
      await next();
    } catch(err) {
      logger.error('>>>>error', err.message);
      ctx.response.status = err.statusCode || err.status || 500;
      ctx.response.body = {
        message: err.message,
      }
      ctx.app.emit('error', err, ctx);
    }
  });

  // log
  app.use( async (ctx:koa.ParameterizedContext<any, {}>, next: ()=>Promise<any>)=> {
    logger.info('request=', ctx.method, ctx.URL.pathname);
    // ctx.throw(401);
    await next();
  });

  // mongodb
  app.use( async (ctx:koa.ParameterizedContext<any, {}>, next: ()=>Promise<any>)=> {
    const mongooseState = mongoose.connection.readyState;
    switch (mongooseState) {
      case 3:
      case 0:
      await mongoose.connect(
        conf.secret.mongoDB.url,
        {
          useNewUrlParser: true,
          user: conf.secret.mongoDB.username,
          pass: conf.secret.mongoDB.password, 
        }
      );
      break;
    }
    await next();
  });

  // always json type
  app.use( async (ctx:koa.ParameterizedContext<any, {}>, next: ()=>Promise<any>)=> {
    ctx.type = 'json';
    ctx.body = {};
    await next();
  });

  app.use(koaJwt({
    secret: conf.secret.jwt.key,
    cookie: 'token',
  }).unless({
    path: [
      '/api/session'
    ]
  }))

  // app.use( async (ctx:koa.ParameterizedContext<ICustomState, {}>, next: ()=>Promise<any>)=> {
  //   const payload = jwt.verify(ctx.headers.authorization.split(' ')[1], conf.secret.jwt.key); 
  //   const {_id, email, name, groups} = payload;
  //   ctx.state.currentUser = {_id, email, name, groups};
  //   await next();
  // });

}