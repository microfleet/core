const assert = require('assert');
const is = require('is');
const path = require('path');
const convict = require('convict');
const stealthyRequire = require('stealthy-require');

// provides custom format with coercion for file paths
convict.addFormat({
  name: 'files',

  // only called if input is string
  coerce(val) {
    let paths = maybeJSON(val);

    // if still remains a string -> convert to array
    if (is.string(paths)) {
      paths = [paths];
    }

    // map each entry
    return paths.map((filepath) => {
      if (path.isAbsolute(filepath)) {
        return filepath;
      }

      return path.normalize(filepath);
    });
  },

  validate(paths) {
    if (Array.isArray(paths) === false) {
      throw new TypeError('must be an array of paths');
    }

    for (const filename of paths) {
      assert(typeof filename === 'string', 'path must be a string');
    }
  },
});

convict.addFormat({
  name: 'node_module',

  validate(value) {
    try {
      require.resolve(value);
    } catch (e) {
      throw new TypeError(`${value} must be a resolvable node.js module`);
    }
  },
});

convict.addParser({
  extension: 'js',
  // whole thing is needed to avoid caching configuration files
  // and allow reloads
  parse(filepath) {
    const initialChildren = module.children.slice();
    // eslint-disable-next-line import/no-dynamic-require
    const configurationFile = stealthyRequire(require.cache, () => require(filepath));
    // gc unused modules
    module.children = initialChildren;
    // return parsed configuration
    return configurationFile;
  },
});

/**
 * Configuration builder plugin.
 * @param  {Microfleet} microfleet - Server Instance.
 * @param  {Object} [opts={}] - Configurator Options.
 */
async function buildConfigurator(microfleet, opts = {}) {
  const kSchema = Symbol('schema');
  const kExtensions = Symbol('extensions');
  const kOverloads = Symbol('overloads');
  const kSelfNamespace = 'config';

  // basic configuration schema
  const config = {
    [kExtensions]: {},
    [kOverloads]: [],
  };

  // public interface
  config.extend = extend;
  config.load = load;
  config.get = get;
  config.reload = reload;

  // self-configure
  config.extend(kSelfNamespace, {
    env: {
      doc: 'Application Environment',
      format: ['production', 'development', 'test'],
      default: 'development',
      env: 'NODE_ENV',
    },
    files: {
      doc: 'Configuration files',
      format: 'files',
      env: 'NCONF_FILE_PATH',
      arg: 'conf',
      default: [],
    },
  });

  // load runtime configuration
  config.load(opts);

  // expose config obj on microfleet instance
  microfleet.decorate(kSelfNamespace, config);

  /**
   * Extends core configuration providing default schema
   * for a given plugin.
   * @param  {string} namespace - Plugin name to register configuration schema for.
   * @param  {Object} schema - Configuration schema.
   */
  function extend(namespace, schema) {
    if (namespace in config[kExtensions]) {
      throw new Error(`"${namespace}" already defined`);
    }

    // register schema
    config[kExtensions][namespace] = schema;

    // rebuilds configurator
    reload();
  }

  /**
   * Returns data at path.
   * @param  {string} name - Nested path via "." notation.
   */
  function get(name) {
    return config[kSchema].get(name);
  }

  /**
   * Loads overrides to an existing schema.
   * @param  {Object} data - KV to merge.
   */
  function load(data) {
    config[kOverloads].push(data);
    reload();
  }

  /**
   * Rebuilds current convict schema.
   * Can be called to load new data from the disk or
   * in case environment changes.
   */
  function reload() {
    const configurator = convict(config[kExtensions]);

    // load all possible overloads, so that we already have new files if needed
    for (const overload of config[kOverloads]) {
      configurator.load(overload);
    }

    // load all files that should be loaded
    for (const file of configurator.get(`${kSelfNamespace}.files`)) {
      configurator.loadFile(file);
    }

    // ensure that no extraneous values are present
    configurator.validate({ allowed: 'strict' });

    // rewrite old configurator
    config[kSchema] = configurator;
  }
}

// Helper method to parse json-encoded string
function maybeJSON(input) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return input;
  }
}

module.exports = buildConfigurator;
