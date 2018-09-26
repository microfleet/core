const grpc = require('grpc');
const get = require('lodash/get');
const { readSslFiles } = require('../../src/plugins/gRPC/helpers/createCredentials');
const loadProtoDefinitions = require('../../src/plugins/gRPC/helpers/loadProtoDefinitions');

function clientCredentials({ ssl }) {
  if (ssl) {
    const { ca, private_key: privateKey, cert_chain: certChain } = readSslFiles(ssl);
    return grpc.credentials.createSsl(ca, privateKey, certChain);
  }

  return grpc.credentials.createInsecure();
}

exports.initClient = (name: String, { server, proto }) => {
  const defs = loadProtoDefinitions(proto);
  const protoDescriptor = grpc.loadPackageDefinition(defs);
  const credentials = clientCredentials(server);
  const Client = get(protoDescriptor, name);

  return new Client(`${server.address}:${server.port}`, credentials);
};
