const path = require('path');
const { NotPermittedError } = require('common-errors');
const callsite = require('callsite');
const _require = require('../utils/require');
const { PluginsTypes } = require('../');

exports.name = 'validator';
exports.type = PluginsTypes.essential;

/**
 * Attaches initialized validator based on conf
 * Provides `validate` and `validateSync` methods
 */
exports.attach = function attachValidator(conf, parentFile) {
  const service = this;
  const Validator = _require('ms-validation');
  const schemasPath = '../../schemas';
  let validator;
  let schemas;

  if (Array.isArray(conf) || conf === undefined) {
    validator = new Validator(schemasPath);
    schemas = conf;
  } else {
    validator = new Validator(schemasPath, conf.filter, conf.ajv);
    schemas = conf.schemas;
  }

  if (schemas) {
    if (!Array.isArray(schemas)) {
      throw new NotPermittedError('validator schemas must be an array of directories, where json schemas are located');  // eslint-disable-line
    }

    // for relative paths
    const stack = callsite();

    // Note that schemas with same file name will be overwritten
    schemas.forEach((_location) => {
      let dir;
      if (!path.isAbsolute(_location)) {
        const length = stack.length;

        // filter out the file itself
        let iterator = 0;
        let source;
        while (iterator < length && !source) {
          const call = stack[iterator];
          const filename = call.getFileName();
          if ([parentFile, __filename, 'native array.js'].indexOf(filename) === -1) {
            source = path.dirname(filename);
          }

          iterator += 1;
        }

        dir = path.resolve(source, _location);
      } else {
        dir = _location;
      }

      validator.init(dir);
    });
  }

  // extend service
  service._validator = validator;
  service.validate = validator.validate;
  service.validateSync = validator.validateSync;

  // if we have schema called `config` - we will use it to validate
  if (validator.$ajv.getSchema('config')) {
    const error = service.validateSync('config', service.config).error;
    if (error) throw error;
  }
};
