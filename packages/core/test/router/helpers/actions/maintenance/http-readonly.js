const { ActionTransport } = require('../../../../..');

module.exports = async function handler() {
  return { success: true };
};

module.exports.transports = [ActionTransport.http];
module.exports.readonly = true;
