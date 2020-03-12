import Validator from '@microfleet/validation'
import ajv from 'ajv'
import callsite = require('callsite')
import { NotPermittedError } from 'common-errors'
import path = require('path')
import { strictEqual } from 'assert'
import { isString, isPlainObject, isFunction } from 'lodash'

import { Microfleet } from '../'
import { PluginTypes } from '../constants'

const { isArray } = Array

/**
 * Validator configuration, more details in
 * https://github.com/microfleet/validation
 */
export type ValidatorConfig = {
  schemas: string[]
  filter: ((filename: string) => boolean) | null
  serviceConfigSchemaIds: string[]
  ajv: ajv.Options
}

/**
 * Plugin name
 */
export const name = 'validator'

/**
 * Defines service extension
 */
export interface ValidatorPlugin {
  validator: Validator & {
    addLocation(location: string): void
  }
  validate: Validator['validate']
  validateSync: Validator['validateSync']
  ifError:  Validator['ifError']
}

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
) {
  const service = this
  // for relative paths
  const stack = callsite()
  const { schemas, serviceConfigSchemaIds, filter, ajv: ajvConfig } = config

  strictEqual(isArray(schemas), true, configError('schemas'))
  strictEqual(isArray(serviceConfigSchemaIds), true, configError('serviceConfigSchemaIds'))
  strictEqual(filter === null || isFunction(filter), true, configError('filter'))
  strictEqual(isPlainObject(ajvConfig), true, configError('ajvConfig'))

  const validator = new Validator('../../schemas', filter, ajvConfig)
  const addLocation = (location: string) => {
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
      service.config = validator.ifError(schema, service.config)
    }
  }

  // extend service
  service[name] = validator
  service[name].addLocation = addLocation

  // @microfleet/validation >= 9.0.1 requires method to be bound to validator instance
  service.validate = validator.validate.bind(validator)
  service.validateSync = validator.validateSync.bind(validator)
  service.ifError = validator.ifError.bind(validator)
}
