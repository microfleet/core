import { Server, ResponseToolkit } from 'hapi'
import { Microfleet, PluginTypes } from '..'
import _require from '../utils/require'
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

  const { config } = service.ifError('prometheus', opts)
  const { port, path, host } = config
  const server = new Server({ host, port })

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

  // handle requests for the metrics
  const handler = (h: ResponseToolkit) => {
    console.log(h)
    // h: ResponseToolkit
    // const data = prometheus.register.metrics()
    // const res = h.response(data)
    // res.header('Content-Type', prometheus.register.contentType)
    // return res
    return prometheus.register.metrics()
  }
  // const options = {
  //   payload: {
  //     defaultContentType: prometheus.register.contentType
  //   }
  // }

  server.route({ method: 'GET', path, handler })

  // 2do: catch amqp/http/...? requests converting them into metrics

  server.start().catch(err => {
    console.log(err)
    process.exit()
  })
}
