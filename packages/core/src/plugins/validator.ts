import Validator from '@microfleet/validation'
import ajv from 'ajv'
import callsite = require('callsite')
import { NotPermittedError } from 'common-errors'
import path = require('path')
import { Microfleet, PluginTypes } from '../'

/**
 * Validator configuration, more details in
 * https://github.com/microfleet/validation
 */
export type ValidatorConfig = string[] | void | {
  filter: (filename: string) => boolean,
  schemas: string[];
  ajv: ajv.Options,
}

/**
 * Plugin name
 */
export const name = 'validator'

/**
 * Defines service extension
 */
export interface ValidatorPlugin {
  [name]: Validator
  validate: Validator['validate']
  validateSync: Validator['validateSync']
  ifError:  Validator['ifError']
}

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Attaches initialized validator based on conf.
 * Provides `validate` and `validateSync` methods.
 * @param conf - Validator Configuration Object.
 * @param parentFile - From which file this plugin was invoked.
 */
export const attach = function attachValidator(
  this: Microfleet,
  conf: ValidatorConfig,
  parentFile: string
) {
  const service = this
  const schemasPath = '../../schemas'
  let validator: Validator
  let schemas

  if (Array.isArray(conf) || conf === undefined) {
    validator = new Validator(schemasPath)
    schemas = conf
  } else {
    validator = new Validator(schemasPath, conf.filter, conf.ajv)
    schemas = conf.schemas
  }

  if (schemas) {
    if (!Array.isArray(schemas)) {
      throw new NotPermittedError('validator schemas must be an array of directories, where json schemas are located')
    }

    // for relative paths
    const stack = callsite()

    // Note that schemas with same file name will be overwritten
    for (const location of schemas) {
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
  }

  // built-in configuration schema
  if (validator.ajv.getSchema('microfleet.core')) {
    service.config = validator.ifError('microfleet.core', service.config)
  }

  // if we have schema called `config` - we will use it to validate
  if (validator.ajv.getSchema('config')) {
    service.config = validator.ifError('config', service.config)
  }

  // extend service
  service[name] = validator
  service.validate = validator.validate
  service.validateSync = validator.validateSync
  service.ifError = validator.ifError
}
