const { NotPermittedError, ConnectionError } = require('common-errors');

exports.ERROR_NOT_STARTED = new NotPermittedError('redis was not started');
exports.ERROR_ALREADY_STARTED = new NotPermittedError('redis was already started');
exports.ERROR_FAILED_HEALTH_CHECK = new ConnectionError('redis healthcheck has been failed');
