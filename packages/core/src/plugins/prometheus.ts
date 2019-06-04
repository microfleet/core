import { createServer } from 'http'
import { Microfleet, PluginTypes } from '..'
import readPkgUp = require('read-pkg-up')
import semver = require('semver')
import Bluebird = require('bluebird')

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
export function attach(this: Microfleet, opts: any = {}) {
  const service = this

  const prometheus = service.prometheus = require('prom-client')

  const { config } = service.ifError(name, opts)
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
    const pkgVersion = readPkgUp.sync({ cwd: process.cwd() }).pkg.version
    const pv = semver.parse(pkgVersion)
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
      labelNames: ['method', 'route', 'transport', 'status', 'statusCode'],
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
