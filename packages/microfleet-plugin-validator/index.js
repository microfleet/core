// @flow
/* eslint-disable promise/no-native */
const path = require('path');
const assert = require('assert');
const { NotPermittedError } = require('common-errors');
const callsite = require('callsite');
const _require = require('@microfleet/utils').require;
const { PluginsTypes } = require('@microfleet/core');

/**
 * Validator configuration, more details in
 * https://github.com/makeomatic/ms-validation
 */
export type ValidatorConfig = Array<string> | void | {
  filter: (filename: string) => boolean,
  schemas: Array<string>,
  ajv: Object,
};

/**
 * Validation function signature - promise based
 * @type {Function}
 */
export type Validate = <T>(schema: string, document: T) => Promise<Error | T>;

/**
 * Validation function signature - sync
 * @type {Function}
 */
export type ValidateSync = <T>(schema: string, document: T) => { error?: Error, doc: T };

/**
 * Plugin name
 * @type {String}
 */
exports.name = 'validator';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.essential;

/**
 * Attaches initialized validator based on conf.
 * Provides `validate` and `validateSync` methods.
 * @param {Object} conf - Validator Configuration Object.
 * @param {string} parentFile - From which file this plugin was invoked.
 */
exports.attach = function attachValidator(conf: ValidatorConfig, parentFile: string) {
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
    // eslint-disable-next-line prefer-destructuring
    schemas = conf.schemas;
  }

  if (schemas) {
    if (!Array.isArray(schemas)) {
      throw new NotPermittedError('validator schemas must be an array of directories, where json schemas are located');
    }

    // for relative paths
    const stack = callsite();

    // Note that schemas with same file name will be overwritten
    schemas.forEach((_location) => {
      let dir;
      if (!path.isAbsolute(_location)) {
        const { length } = stack;

        // filter out the file itself
        let iterator = 0;
        let source = '';
        while (iterator < length && !source) {
          const call = stack[iterator];
          const filename = call.getFileName();
          if ([parentFile, __filename, 'native array.js', null].indexOf(filename) === -1) {
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
  service[`_${exports.name}`] = validator;
  service.validate = (validator.validate: Validate);
  service.validateSync = (validator.validateSync: ValidateSync);

  // if we have schema called `config` - we will use it to validate
  if (validator.$ajv.getSchema('config')) {
    assert.ifError(service.validateSync('config', service.config).error);
  }
};
