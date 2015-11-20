const Errors = require('common-errors');
const Validator = require('ms-amqp-validation');

exports.name = 'validator';

/**
 * Attaches initialized validator based on conf
 * Provides `validate` and `validateSync` methods
 */
exports.attach = function attachValidator(conf) {
  const service = this;
  const validator = new Validator('../../schemas');

  if (conf) {
    if (!Array.isArray(conf)) {
      throw new Errors.NotPermittedError('.validator must be an array of directories, where json schemas are located');
    }

    // Note that schemas with same file name will be overwritten
    conf.forEach(location => {
      validator.init(location);
    });
  }

  // extend service
  service._validator = validator;
  service.validate = validator.validate;
  service.validateSync = validator.validateSync;
};
