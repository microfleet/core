const _require = require('./require');

try {
  module.exports = _require('@makeomatic/ioredis');
} catch (e) {
  module.exports = _require('ioredis');
}
