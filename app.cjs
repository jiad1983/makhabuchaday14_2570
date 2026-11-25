// Plesk Phusion Passenger synchronous CommonJS startup entry point
const fs = require('fs');
const path = require('path');

const serverCjs = path.join(__dirname, 'server.cjs');
if (fs.existsSync(serverCjs)) {
  module.exports = require(serverCjs);
} else {
  try {
    require('tsx/cjs');
    module.exports = require('./server.ts');
  } catch (err) {
    console.error('Could not load server.cjs or tsx/cjs. Run `npm run build` first.', err);
    process.exit(1);
  }
}
