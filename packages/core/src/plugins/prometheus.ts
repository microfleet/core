import { createServer } from 'http'
import { Microfleet, PluginTypes } from '..'
import { getVersion } from '../utils/packageInfo'
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
  const { port, path } = config

  // register default metrics
  prometheus.register.clear()
  prometheus.collectDefaultMetrics()

  // register service version metric
  if (!prometheus.register.getSingleMetric('application_version_info')) {
    createAppVersionMetric(prometheus)
  }

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
  const pv = semver.parse(getVersion())
  const appVersion = new prometheus.Gauge({
    name: 'application_version_info',
    help: 'application version info',
    labelNames: ['version', 'major', 'minor', 'patch'],
  })
  appVersion.labels(`v${pv!.version}`, pv!.major, pv!.minor, pv!.patch).set(1)
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
