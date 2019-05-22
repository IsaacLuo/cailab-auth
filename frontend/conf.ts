const conf = {
  serverURL: 'https://api.auth.cailab.org'
};

if(process.env.NODE_ENV === 'development') {
  console.warn('debug config');
  conf.serverURL = 'http://local.cailab.org:8000';
}

export default conf;