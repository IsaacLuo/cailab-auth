import secret from './secret'

export default {
  serverAddress: 'https://auth.cailab.org',
  domainAddress: 'cailab.org',
  secret,
  mails: {
    verification:{
    subject: 'cailab email verification',
    htmlTemplate: `
<h1>Please verify your email address in cailab.org</h1>
<p> you registered on cailab.org recently, if it was not you, please DO NOT click the link in the email, and delete the email immediately</p>
<p> to verify your email for cailab.org, please click <a href="{%verificationLink%}">this link</a>, or copy this address to your browser</p>
<p> <a href="{%verificationLink%}">{%verificationLink%}</a> </p>
<p> this link validates until {%validateUntil%}</p>
`
  },
  resetPassword: {
    subject: 'you are resetting your password',
    htmlTemplate: `
<h1>You are going to reset your cailab password</h1>
<p>click this link to reset your password</p>
<p> <a href="{%verificationLink%}">{%verificationLink%}</a> </p>
<p> this link validates until {%validateUntil%}</p>
`
  }
  }
};