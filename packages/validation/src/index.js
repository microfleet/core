const assert = require('assert');
const path = require('path');
const Validator = require('@microfleet/utils-validation');

async function buildValidation(microfleet, opts = {}) {
  const kInstance = Symbol('ajv');
  const namespace = opts.namespace || 'validation';
  const validator = {};

  // decorates core
  // will throw if config plugin has not been loaded
  assert(microfleet.hasDecorator('config'), 'Must enable config module');

  // provides configuration for the module
  microfleet.config.extend(namespace, {
    schemas: {
      doc: 'Location of schemas',
      format: 'files',
      default: [path.resolve(process.cwd(), 'schemas')],
      arg: 'schemas',
    },
    filter: {
      doc: 'Filter out files at the location, uses .json only by default',
      format: Function,
      default: Validator.jsonFilter,
    },
    ajv: {
      doc: 'AJV instance settings',
      format: Object,
      default: Validator.defaultOptions,
    },
    Promise: {
      doc: 'Promise library to use',
      default: Promise, // eslint-disable-line promise/no-native
    },
  });

  // get aggregated configuration for the module
  const config = microfleet.config.get(namespace);
  const kPromise = config.Promise;

  // create validator instance
  const instance = validator[kInstance] = new Validator({
    schemaDir: config.schemas,
    filter: config.filter,
    schemaOptions: config.ajv,
  });

  await validator[kInstance].init();

  // public API
  validator.validate = validate;
  validator.validateSync = validateSync;

  // decorate server
  microfleet.decorate(namespace, validator);

  /**
   * Validates <data> using <schema> name.
   * @param  {*} data - Input.
   * @param  {string} schema - Schema name to use.
   * @param  {string} [dataVar] - Param we are validating, ie "headers", "body", "params".
   */
  function validate(data, schema, dataVar) {
    const ret = instance.validate(schema, data, dataVar);
    if (ret === null) {
      return kPromise.resolve(data);
    }

    return kPromise.reject(ret);
  }

  /**
   * Validates <data> using <schema> name, throw on error.
   * @param  {*} data - Input.
   * @param  {string} schema - Schema name to use.
   * @param  {string} [dataVar] - Param we are validating, ie "headers", "body", "params".
   */
  function validateSync(data, schema, dataVar) {
    return instance.ifError(schema, data, dataVar);
  }
}

module.exports = buildValidation;
