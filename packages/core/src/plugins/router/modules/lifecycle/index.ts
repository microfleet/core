import Bluebird = require('bluebird')
import Errors = require('common-errors')
import _debug = require('debug')
import is = require('is')
import upperFirst = require('lodash/upperFirst')
import Extensions, { LifecycleRequestType } from '../../extensions'

const debug = _debug('mservice:router:module:lifecycle')
export type PromiseFactory = (...args: any[]) => PromiseLike<any>

function moduleLifecycle(
  module: string,
  promiseFactory: PromiseFactory,
  extensions: Extensions,
  args: any[],
  context?: any
) {
  if (is.string(module) === false) {
    return Bluebird.reject(new Errors.ArgumentError('module'))
  }

  if (is.fn(promiseFactory) === false) {
    return Bluebird.reject(new Errors.ArgumentError('promiseFactory'))
  }

  if ((extensions instanceof Extensions) === false) {
    return Bluebird.reject(new Errors.ArgumentError('extensions'))
  }

  if (is.array(args) === false) {
    return Bluebird.reject(new Errors.ArgumentError('args'))
  }

  debug('lifecycle for module "%s"', module)

  const upperFirstName = upperFirst(module)
  const preModule = `pre${upperFirstName}` as LifecycleRequestType
  const postModule = `post${upperFirstName}` as LifecycleRequestType
  let result

  if (extensions.has(preModule)) {
    result = Bluebird.resolve([preModule, args, context])
      .bind(extensions)
      .spread(extensions.exec)
  } else {
    result = Bluebird.resolve(args)
  }

  return result
    .bind(context)
    .spread(promiseFactory)
    .reflect()
    .then((inspection) => {
      let resultResponse = null
      let errorResponse = null

      if (inspection.isFulfilled()) {
        resultResponse = inspection.value()
      } else {
        errorResponse = inspection.reason()
      }

      if (extensions.has(postModule) === false) {
        if (errorResponse) {
          return Bluebird.reject(errorResponse)
        }

        return resultResponse
      }

      return Bluebird
        .resolve([postModule, [errorResponse, resultResponse, ...args], context])
        .bind(extensions)
        .spread(extensions.exec)
        .spread((error, response) => {
          if (error) {
            return Bluebird.reject(error)
          }

          return response
        })
    })
}

export default moduleLifecycle
