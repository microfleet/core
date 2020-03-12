import { createServer } from 'http'
import assert = require('assert')
import { Microfleet, PluginTypes, RouterPlugin, ValidatorPlugin } from '..'
import { getVersion } from '../utils/packageInfo'
import semver = require('semver')
import Bluebird = require('bluebird')

const usageError = `
if "prometheus" and "router" plugins are used together - you have to  manually configure router handlers:

const {
  default: metricObservability
} = require('@microfleet/core/lib/plugins/router/extensions/audit/metrics')
config.router.extensions.enabled = ["preRequest", "postResponse"]
config.router.extensions.register = [metricObservability()]

In future we expect to handle it automatically :)
`

/**
 * Plugin Name
 */
export const name = 'prometheus'

/**
 * Plugin Type
 */
export const type = PluginTypes.application

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 50

/**
 * Attaches plugin to the MService class.
 * @param settings - prometheus settings
 */
export function attach(this: Microfleet & RouterPlugin & ValidatorPlugin, opts: any = {}) {
  const service = this

  if (service.config.plugins.includes('router')) {
    const extensions = service.router.config.extensions || {}
    assert(extensions.enabled.includes('preRequest') && extensions.enabled.includes('postResponse'), usageError)
  }

  const prometheus = service.prometheus = require('prom-client')

  const { config } = service.validator.ifError(name, opts)
  const { port, path, durationBuckets } = config

  // register default metrics
  prometheus.register.clear()
  prometheus.collectDefaultMetrics()

  // register service version metric
  createAppVersionMetric(prometheus)
  // register methods latency histogram
  service.metricMicrofleetDuration = createMethodsRequestsMetric(prometheus, durationBuckets)

  // handle metric requests
  const server = createServer(createMetricHandler(prometheus, path))

  return {
    async connect() {
      let resolve: any
      let reject: any
      const listen = new Promise((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
      })

      try {
        server.once('listening', resolve)
        server.once('error', reject)
        server.listen(port)
        await listen
      } finally {
        server.removeListener('listening', resolve)
        server.removeListener('error', reject)
      }
    },

    async close() {
      await Bluebird.fromCallback(next => server.close(next))
    },
  }
}

function createAppVersionMetric(prometheus: any) {
  let metric = prometheus.register.getSingleMetric('application_version_info')
  if (!metric) {
    const pv = semver.parse(getVersion())
    metric = new prometheus.Gauge({
      name: 'application_version_info',
      help: 'application version info',
      labelNames: ['version', 'major', 'minor', 'patch'],
    })
    metric.labels(`v${pv!.version}`, pv!.major, pv!.minor, pv!.patch).set(1)
  }
  return metric
}

function createMethodsRequestsMetric(prometheus: any, buckets: number[]) {
  let metric = prometheus.register.getSingleMetric('microfleet_request_duration_milliseconds')
  if (!metric) {
    metric = new prometheus.Histogram({
      buckets,
      name: 'microfleet_request_duration_milliseconds',
      help: 'duration histogram of microfleet route requests',
      labelNames: ['method', 'route', 'transport',  'statusCode'],
    })
  }
  return metric
}

function createMetricHandler(prometheus: any, path: string) {
  return (req: any, res: any) => {
    if (req.method === 'GET' && req.url === path) {
      res.writeHead(200, { 'Content-Type': prometheus.register.contentType })
      res.write(prometheus.register.metrics())
    } else {
      res.writeHead(404, { 'Content-Type': prometheus.register.contentType })
      res.write('404 Not Found')
    }
    res.end()
  }
}
