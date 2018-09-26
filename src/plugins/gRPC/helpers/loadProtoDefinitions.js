const path = require('path');
const _require = require('../../../utils/require');

module.exports = function loadProtoDefinitions(proto) {
  // eslint-disable-next-line no-dynamic-require
  const loader = _require('@gRPC/proto-loader');
  const protoDefinitionsPath = path.resolve(process.cwd(), proto.definitions);
  return loader.loadSync(protoDefinitionsPath, proto.options);
};
