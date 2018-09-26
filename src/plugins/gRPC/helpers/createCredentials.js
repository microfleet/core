const fs = require('fs');
const path = require('path');

function readFileSync(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  return fs.readFileSync(fullPath);
}

function readSslFiles({ rootCerts = null, privateKey, certChain }) {
  const ca = rootCerts ? readFileSync(rootCerts) : null;
  /* eslint-disable camelcase */
  const private_key = readFileSync(privateKey);
  const cert_chain = readFileSync(certChain);
  return {
    ca,
    private_key,
    cert_chain,
  };
  /* eslint-enable */
}

exports.readSslFiles = readSslFiles;
exports.createCredentials = function createCredentials(grpc, ssl) {
  if (ssl) {
    const { ca, ...keyCertPairs } = readSslFiles(ssl);
    return grpc.ServerCredentials
      .createSsl(ca, keyCertPairs);
  }

  return grpc.ServerCredentials.createInsecure();
};
