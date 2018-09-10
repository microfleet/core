const { NotPermittedError, ConnectionError } = require('common-errors');

exports.ERROR_NOT_STARTED = new NotPermittedError('redis was not started');
exports.ERROR_NOT_HEALTHY = new ConnectionError('redis connection is not healthy');
exports.ERROR_ALREADY_STARTED = new NotPermittedError('redis was already started');
