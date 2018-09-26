const { gRPCTypes } = require('../../../constants');

exports.getCallTypeFromCall = function getCallTypeFromCall(call) {
  const callPrototype = Object.getPrototypeOf(call);

  if (callPrototype && callPrototype.constructor && callPrototype.constructor.name) {
    const cName = callPrototype.constructor.name;

    if (cName === 'ServerDuplexStream') {
      return gRPCTypes.duplex;
    }

    if (cName === 'ServerWritableStream') {
      return gRPCTypes.responseStream;
    }

    if (cName === 'ServerReadableStream') {
      return gRPCTypes.requestStream;
    }

    return gRPCTypes.unary;
  }

  return null;
};

exports.getCallTypeFromDescriptor = function getCallTypeFromDescriptor(descriptor) {
  if (!descriptor.requestStream && !descriptor.responseStream) {
    return gRPCTypes.unary;
  }

  if (!descriptor.requestStream && descriptor.responseStream) {
    return gRPCTypes.responseStream;
  }

  if (descriptor.requestStream && !descriptor.responseStream) {
    return gRPCTypes.requestStream;
  }

  return gRPCTypes.duplex;
};
