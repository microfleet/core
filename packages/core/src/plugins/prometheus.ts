import { createServer } from 'http'
import { Microfleet, PluginTypes } from '..'
import readPkgUp = require('read-pkg-up')
import semver = require('semver')

/**
 * Plugin Name
 */
export const name = 'prometheus'

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
    const pkgVersion = readPkgUp.sync({ cwd: process.cwd() }).pkg.version
    const parsedVersion = semver.parse(pkgVersion)
    const appVersion = new prometheus.Gauge({
      name: 'application_version_info',
      help: 'application version info',
      labelNames: ['version', 'major', 'minor', 'patch']
    })
    appVersion.labels(`v${parsedVersion!.version}`, parsedVersion!.major, parsedVersion!.minor, parsedVersion!.patch).set(1)
  }

  // handle metric requests
  createServer((req, res) => {
    if (req.method === 'GET' && req.url === path) {
      res.writeHead(200, {'Content-Type': prometheus.register.contentType })
      res.write(prometheus.register.metrics())
    } else {
      res.writeHead(404, {'Content-Type': prometheus.register.contentType })
      res.write('404 Not Found')
    }
    res.end()
  }).listen(port)
}
