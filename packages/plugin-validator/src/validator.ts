import { Validator } from '@microfleet/validation'
import ajv from 'ajv'
import callsite = require('callsite')
import { NotPermittedError } from 'common-errors'
import path = require('path')
import { strictEqual } from 'assert'
import { isString, isPlainObject, isFunction } from 'lodash'
import { deprecate } from 'util'
import { Microfleet, PluginTypes } from '@microfleet/core'

const { isArray } = Array

/**
 * Validator configuration, more details in
 * https://github.com/microfleet/validation
 */
export type ValidatorConfig = {
  schemas: string[];
  filter: ((filename: string) => boolean) | null;
  serviceConfigSchemaIds: string[];
  ajv: ajv.Options;
}

/**
 * Plugin name
 */
export const name = 'validator'

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0

function configError(property: string): NotPermittedError {
  return new NotPermittedError(`Invalid validator.${property} config`)
}

/**
 * Attaches initialized validator based on conf.
 * Provides `validate` and `validateSync` methods.
 * @param conf - Validator Configuration Object.
 * @param parentFile - From which file this plugin was invoked.
 */
export const attach = function attachValidator(
  this: Microfleet,
  config: ValidatorConfig,
  parentFile: string
): void {
  // for relative paths
  const stack = callsite()
  const { schemas, serviceConfigSchemaIds, filter, ajv: ajvConfig } = config

  strictEqual(isArray(schemas), true, configError('schemas'))
  strictEqual(isArray(serviceConfigSchemaIds), true, configError('serviceConfigSchemaIds'))
  strictEqual(filter === null || isFunction(filter), true, configError('filter'))
  strictEqual(isPlainObject(ajvConfig), true, configError('ajvConfig'))

  const validator = new Validator('../../schemas', filter, ajvConfig)
  const addLocation = (location: string): void => {
    strictEqual(isString(location) && location.length !== 0, true, configError('schemas'))

    let dir
    if (!path.isAbsolute(location)) {
      const { length } = stack

      // filter out the file itself
      let iterator = 0
      let source = ''
      while (iterator < length && !source) {
        const call = stack[iterator]
        const filename = call.getFileName()
        if ([parentFile, __filename, 'native array.js', null].indexOf(filename) === -1) {
          source = path.dirname(filename)
        }

        iterator += 1
      }

      dir = path.resolve(source, location)
    } else {
      dir = location
    }

    validator.init(dir)
  }

  // Note that schemas with same file name will be overwritten
  for (const location of schemas) {
    addLocation(location)
  }

  // built-in configuration schema
  for (const schema of serviceConfigSchemaIds) {
    strictEqual(isString(schema) && schema.length !== 0, true, configError('serviceConfigSchemaIds'))

    if (validator.ajv.getSchema(schema)) {
      this.config = validator.ifError(schema, this.config)
    }
  }

  validator.addLocation = addLocation

  // extend service
  this[name] = validator
  this.validate = deprecate(validator.validate.bind(validator), 'validate() deprecated. User validator.validate()')
  this.validateSync = deprecate(validator.validateSync.bind(validator), 'validateSync() deprecated. User validator.validateSync()')
  this.ifError = deprecate(validator.ifError.bind(validator), 'ifError() deprecated. User validator.ifError()')
}

declare module '@microfleet/validation' {
  export interface Validator {
    addLocation(location: string): void;
  }
}

declare module '@microfleet/core' {
  export interface Microfleet {
    validator: Validator;
    validate: Validator['validate'];
    validateSync: Validator['validateSync'];
    ifError: Validator['ifError'];
  }

  export interface ConfigurationOptional {
    validator: ValidatorConfig;
  }
}
