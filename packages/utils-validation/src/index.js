const Ajv = require('ajv');
const keywords = require('ajv-keywords');
const path = require('path');
const callsite = require('callsite');
const util = require('util');
const glob = util.promisify(require('glob'));
const stat = util.promisify(require('fs').stat);
const debug = require('debug')('microfleet:validation');

/**
 * Creates human-readable error from ajv response.
 * Borrowed from https://github.com/fastify/fastify/blob/master/lib/validation.js#L137-L150.
 *
 * @param  {Object} [errors=this.errors] - Errors to transform.
 * @param  {Object} [options={}] - Settings.
 * @returns {string} - Human Readable Error.
 */
function schemaErrorsText(errors, options = {}) {
  if (!errors) return 'No errors';

  const separator = options.separator === undefined ? ', ' : options.separator;
  const dataVar = options.dataVar === undefined ? 'data' : options.dataVar;

  let text = '';
  for (let i = 0; i < errors.length; i += 1) {
    const e = errors[i];
    if (e) {
      if (e.keyword === 'additionalProperties') {
        text += `should NOT have additional property "${dataVar + e.dataPath}.${e.params.additionalProperty}"${separator}`;
      } else {
        text += `"${dataVar + e.dataPath}" ${e.message}${separator}`;
      }
    }
  }

  return text.slice(0, -separator.length);
}

/**
 * @class Validator
 */
class Validator {
  /**
   * Read more about options here:
   * https://github.com/epoberezkin/ajv
   * @type {Object}
   */
  static defaultOptions = {
    removeAdditional: true,
    coerceTypes: true,
    useDefaults: true,
    v5: true,
    $data: true,
  };

  /**
   * Default filter function.
   * @param {string} filename - File to test.
   * @returns {boolean} - Whether schema matches or not.
   */
  static jsonFilter = filename => path.extname(filename) === '.json';

  /**
   * Default platform path separator.
   * @type {RegExp}
   */
  static slashes = new RegExp(path.sep, 'g');

  /**
   * Default error wrapper, noop transform.
   * @type {Function}
   * @param {*} err - Pass-through err.
   */
  static errorWrapper = err => err;

  /**
   * Initializes validator with schemas in the schemaDir with a given filter function
   * and schemaOptions.
   * @param {Object} [opts={}] - Configuration options.
   * @param {string} [opts.schemaDir] - Directory to load json-schemas from.
   * @param {Function} [opts.filter] - Schemas filter, by default extracts only .json files.
   * @param {Object} [opts.schemaOptions] - Overwrite default AJV options.
   */
  constructor(opts = {}) {
    const {
      schemaDir,
      filter = Validator.jsonFilter,
      schemaOptions = {},
      wrap = Validator.errorWrapper,
    } = opts;

    this.config = {
      schemaDir,
      filter,
      schemaOptions: {
        ...Validator.defaultOptions,
        ...schemaOptions,
      },
    };

    this.validators = Object.create(null);
    this.ajv = keywords(new Ajv(this.config.schemaOptions));
    this.wrap = wrap;
  }

  /**
   * Init function - loads schemas from config dir.
   * Can call multiple times to load multiple dirs, though one must make sure
   * that files are named differently, otherwise validators will be overwritten.
   *
   * @param {string} [directory] - Path to load schemas from.
   * @param {boolean} [removePreviousSchemas=false] - Clean the instance.
   */
  async init(directory, removePreviousSchemas = false) {
    if (removePreviousSchemas === true) {
      this.ajv.removeSchema();
    }

    let cwd = directory || this.config.schemaDir;

    if (!path.isAbsolute(cwd)) {
      const stack = callsite();
      const { length } = stack;

      // filter out the file itself
      let iterator = 0;
      let source;

      while (iterator < length && !source) {
        const call = stack[iterator];
        const filename = call.getFileName();
        if (filename !== __filename) {
          source = path.dirname(filename);
        }
        iterator += 1;
      }

      cwd = path.resolve(source, cwd);
    }

    const fileData = await stat(cwd);
    if (fileData.isDirectory() === false) {
      throw new Error(`"${cwd}" is not a directory, can't load schemas...`);
    }

    const list = await glob('**', { cwd });
    const filenames = list.filter(this.config.filter);

    if (filenames.length === 0) {
      throw new Error(`no schemas found in dir "${cwd}"`);
    }

    for (const filename of filenames) {
      const modulePath = require.resolve(path.resolve(cwd, filename));
      const schema = require(modulePath); // eslint-disable-line import/no-dynamic-require
      require.cache[modulePath] = undefined; // erase cache for further requires
      const id = schema.$id || schema.id;
      const defaultName = modulePath
        .slice(cwd.length + 1)
        .replace(/\.[^.]+$/, '')
        .replace(Validator.slashes, '.');

      debug(
        'adding schema [%s], %s with id choice of $id: [%s] vs defaultName: [%s]',
        id || defaultName, modulePath, id, defaultName
      );

      this.ajv.addSchema(schema, id || defaultName);
    }
  }


  /**
   * @private
   * Internal validation function
   * @param  {string} schema - Schema name.
   * @param  {Mixed} data - Date to validate.
   */
  validateData(schema, data) {
    const validate = this.ajv.getSchema(schema);
    const ret = validate && validate(data);

    if (ret === undefined) return new Error(`schema "${schema}" not found`);
    if (ret === false) return validate.errors;
    return false;
  }

  /**
   * Validates that input data conforms to schema.
   *
   * @param {string} schema - Schema name.
   * @param {Mixed} data - Date to validate.
   * @param {string} [dataVar] - Root variable for human readable error.
   */
  validate(schema, data, dataVar) {
    const result = this.validateData(schema, data);
    if (result === false) return null;
    if (result instanceof Error) return result;
    const error = new Error(schemaErrorsText(result, { dataVar }));
    error.validation = result;
    return this.wrap(error);
  }

  /**
   * Throws when validation fails, otherwise returns input data.
   * @param {string} schema - Schema to validate.
   * @param {*} data - Data to validate.
   * @param {string} [dataVar] - Root variable for human readable error.
   */
  ifError(schema, data, dataVar) {
    const error = this.validate(schema, data, dataVar);
    if (error === null) return data;
    if (debug.enabled) debug(JSON.stringify(data, null, 2));
    throw error;
  }
}

module.exports = Validator;
