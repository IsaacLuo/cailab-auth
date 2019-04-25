import { IUser, IEmailVerification } from './types';
import mongoose, { Model, Document } from 'mongoose'
import {Schema} from 'mongoose'

export const UserSchema = new Schema({
  email: String,
  passwordHash: String, // empty if user signed up using google account
  passwordSalt: String, // empty if user signed up using google account
  authType: String,
  name: String, // user's full name
  groups: [String], // array of group name, 'guest', 'users', 'visitors', or 'administrators'
  createdAt: Date,
  updatedAt: Date,
});

export const EmailVerificationSchema = new Schema({
  email: String,
  token: String,
  createdAt: Date,
  validateUntil: Date,
});

export interface IUserModel extends IUser, Document{
}
export interface IEmailVerificationModel extends IEmailVerification, Document{
}

export const User:Model<IUserModel> = mongoose.model('User', UserSchema, 'users');
export const EmailVerification:Model<IEmailVerificationModel> = mongoose.model('EmailVerification', EmailVerificationSchema, 'email_verifications');