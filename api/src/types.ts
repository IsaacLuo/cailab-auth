export interface IGLobalConfig {
  maxTubeDeleteLimit: number;
  host: string;
  port: number;
  publicURL?: string;
}

export interface IUserEssential {
  _id: any;
  email: string;
  name: string; // user's full name
  groups: string[]; // array of group name, 'guest', 'users', 'visitors', or 'administrators'
  abbr?: string;
}

export interface ITokenContent extends IUserEssential {
  iat: number;
  exp: number;
}

export interface IUser extends IUserEssential {
  createdAt?: Date;
  updatedAt?: Date;
  passwordHash?: string; // empty if user signed up using google account
  passwordSalt?: string; // empty if user signed up using google account
}

export interface ICustomState {
  user?: ITokenContent;
  data?: any;
  forceRefreshToken?: boolean;
}

export interface IEmailVerification {
  _id: any;
  email: string;
  token: string;
  createdAt: Date;
  validateUntil: Date;
}

export interface IPortrait {
  _id: any;
  user: IUser;
  xs: any;
  s: any;
  m: any;
  l: any;
  xl: any;
}