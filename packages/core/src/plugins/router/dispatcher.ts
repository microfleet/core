import Bluebird = require('bluebird')
import _debug = require('debug')
import is = require('is')
import { Tags } from 'opentracing'
import uuid = require('uuid')
import { ServiceRequest } from '../../types'
import { MicrofleetRouter } from './factory'

const debug = _debug('mservice:router:dispatch')
const { ERROR, COMPONENT } = Tags

const wrapPromise = (span: any, promise: any, callback?: (err: any, result?: any) => void) => (
  promise
    .catch((err: Error) => {
      span.setTag(ERROR, true)
      span.log({
        'error.object': err,
        event: 'error',
        message: err.message,
        stack: err.stack,
      })
      throw err
    })
    .finally(() => {
      span.finish()
    })
    .asCallback(callback)
)

function reflectToProps(this: ServiceRequest, reflection: Bluebird.Inspection<any>) {
  return reflection.isRejected()
    ? [reflection.reason(), undefined, this]
    : [null, reflection.value(), this]
}

function dispatch(
  this: MicrofleetRouter,
  route: string,
  request: ServiceRequest,
  callback?: (err: any, result?: any) => void
): Bluebird<any> | void {
  const router = this
  const { modules, service } = router

  debug('initiating request on route %s', route)

  // if we have installed tracer - init span
  let span
  if (service.tracer !== undefined) {
    span = request.span = service.tracer.startSpan(`dispatch:${route}`, {
      childOf: request.parentSpan,
      tags: {
        [COMPONENT]: request.transport,
      },
    })
  }

  request.log = service.log.child({
    reqId: uuid.v4(),
  })

  let result = Bluebird
    .resolve([route, request])
    .bind(service)
    .spread(modules.request)
    .then(modules.auth)
    .then(modules.validate)
    .then(modules.allowed)
    .then(modules.handler)

  if (is.fn(callback)) {
    result = result
      .reflect() // <-- reflect promise
      .bind(request) // <-- bind to request
      .then(reflectToProps) // <-- process data
      .bind(service) // <-- bind back to service
      .then(modules.response)
  }

  return span !== undefined
    ? wrapPromise(span, result, callback)
    : result.asCallback(callback)
}

export default dispatch
