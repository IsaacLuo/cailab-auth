import { IUser, IEmailVerification, IEmailResetPassword, IPortrait } from './types';
import mongoose, { Model, Document } from 'mongoose'
import {Schema} from 'mongoose'

export const PortraitSchema = new Schema<IPortrait>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  xs: Buffer,
  s: Buffer,
  m: Buffer,
  l: Buffer,
  xl: Buffer,
});

export const UserSchema = new Schema<IUser>({
  email: String,
  passwordHash: String, // empty if user signed up using google account
  passwordSalt: String, // empty if user signed up using google account
  authType: String,
  name: String, // user's full name
  groups: [String], // array of group name, 'guest', 'users', 'visitors', or 'administrators'
  abbr: String, // two letters name abbrivation
  portrait: {
    type: Schema.Types.ObjectId,
    ref: 'Portrait',
  },
  createdAt: Date,
  updatedAt: Date,
});

export const EmailVerificationSchema = new Schema<IEmailVerification>({
  email: String,
  token: String,
  createdAt: Date,
  validateUntil: Date,
});

export const EmailResetPasswordSchema = new Schema<IEmailResetPassword>({
  email: String,
  token: String,
  createdAt: Date,
  validateUntil: Date,
  used: Boolean,
});


// export interface IUserModel extends IUser, Document{}
// export interface IEmailVerificationModel extends IEmailVerification, Document{}
// export interface IEMailResetPasswordModel extends IEmailResetPassword, Document{}
// export interface IPortraitModel extends IPortrait, Document{}

export const User = mongoose.model<IUser>('User', UserSchema, 'users');
export const EmailVerification= mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema, 'email_verifications');
export const EmailResetPassword = mongoose.model<IEmailResetPassword>('EmailResetPassword', EmailResetPasswordSchema, 'email_reset_password');
export const Portrait = mongoose.model<IPortrait>('portraits', PortraitSchema, 'portraits');