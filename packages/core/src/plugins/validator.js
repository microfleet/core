"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("@microfleet/validation");
const callsite = require("callsite");
const common_errors_1 = require("common-errors");
const path = require("path");
const assert_1 = require("assert");
const lodash_1 = require("lodash");
const util_1 = require("util");
const constants_1 = require("../constants");
const { isArray } = Array;
/**
 * Plugin name
 */
exports.name = 'validator';
/**
 * Plugin Type
 */
exports.type = constants_1.PluginTypes.essential;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
function configError(property) {
    return new common_errors_1.NotPermittedError(`Invalid validator.${property} config`);
}
/**
 * Attaches initialized validator based on conf.
 * Provides `validate` and `validateSync` methods.
 * @param conf - Validator Configuration Object.
 * @param parentFile - From which file this plugin was invoked.
 */
exports.attach = function attachValidator(config, parentFile) {
    // for relative paths
    const stack = callsite();
    const { schemas, serviceConfigSchemaIds, filter, ajv: ajvConfig } = config;
    assert_1.strictEqual(isArray(schemas), true, configError('schemas'));
    assert_1.strictEqual(isArray(serviceConfigSchemaIds), true, configError('serviceConfigSchemaIds'));
    assert_1.strictEqual(filter === null || lodash_1.isFunction(filter), true, configError('filter'));
    assert_1.strictEqual(lodash_1.isPlainObject(ajvConfig), true, configError('ajvConfig'));
    const validator = new validation_1.default('../../schemas', filter, ajvConfig);
    const addLocation = (location) => {
        assert_1.strictEqual(lodash_1.isString(location) && location.length !== 0, true, configError('schemas'));
        let dir;
        if (!path.isAbsolute(location)) {
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
            dir = path.resolve(source, location);
        }
        else {
            dir = location;
        }
        validator.init(dir);
    };
    // Note that schemas with same file name will be overwritten
    for (const location of schemas) {
        addLocation(location);
    }
    // built-in configuration schema
    for (const schema of serviceConfigSchemaIds) {
        assert_1.strictEqual(lodash_1.isString(schema) && schema.length !== 0, true, configError('serviceConfigSchemaIds'));
        if (validator.ajv.getSchema(schema)) {
            this.config = validator.ifError(schema, this.config);
        }
    }
    // extend service
    this[exports.name] = validator;
    this[exports.name].addLocation = addLocation;
    this.validate = util_1.deprecate(validator.validate.bind(validator), 'validate() deprecated. User validator.validate()');
    this.validateSync = util_1.deprecate(validator.validateSync.bind(validator), 'validateSync() deprecated. User validator.validateSync()');
    this.ifError = util_1.deprecate(validator.ifError.bind(validator), 'ifError() deprecated. User validator.ifError()');
};
//# sourceMappingURL=validator.js.map