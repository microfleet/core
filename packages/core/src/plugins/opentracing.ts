import assert = require('assert')
import { NotFoundError } from 'common-errors'
import { FORMAT_HTTP_HEADERS } from 'opentracing'
import { Microfleet, PluginTypes } from '../'
import _require from '../utils/require'

/**
 * Plugin Name
 */
export const name = 'opentracing'

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 50

/**
 * Attaches plugin to the MService class.
 * @param settings - AMQP plugin configuration.
 */
export function attach(this: Microfleet, opts: any = {}) {
  const service = this
  const { initTracer, ZipkinB3TextMapCodec } = _require('jaeger-client')

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  const settings = service.ifError('opentracing', opts)

  // init tracer
  const tracer = service.tracer = initTracer(settings.config, {
    ...settings.options,
    logger: service.log,
  })

  // support zipkin headers
  // https://github.com/jaegertracing/jaeger-client-node#zipkin-compatibility
  const codec = new ZipkinB3TextMapCodec({ urlEncoding: true })
  tracer.registerInjector(FORMAT_HTTP_HEADERS, codec);
  tracer.registerExtractor(FORMAT_HTTP_HEADERS, codec);
}
