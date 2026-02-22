process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { execSync } = require('child_process');
try {
  execSync('dailaunch claim', { stdio: 'inherit' });
} catch(e) {}