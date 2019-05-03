import { IUser, IEmailVerification, IPortrait } from './types';
import mongoose, { Model, Document } from 'mongoose'
import {Schema} from 'mongoose'

export const PortraitSchema = new Schema({
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

export const UserSchema = new Schema({
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

export const EmailVerificationSchema = new Schema({
  email: String,
  token: String,
  createdAt: Date,
  validateUntil: Date,
});


export interface IUserModel extends IUser, Document{}
export interface IEmailVerificationModel extends IEmailVerification, Document{}
export interface IPortraitModel extends IPortrait, Document{}

export const User:Model<IUserModel> = mongoose.model('User', UserSchema, 'users');
export const EmailVerification:Model<IEmailVerificationModel> = mongoose.model('EmailVerification', EmailVerificationSchema, 'email_verifications');
export const Portrait:Model<IPortraitModel> = mongoose.model('portraits', PortraitSchema, 'portraits');