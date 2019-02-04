import { Server/*, ResponseToolkit*/ } from 'hapi'
import { Microfleet, PluginTypes } from '..'
import _require from '../utils/require'
const prometheus = require('prom-client')
// import semver = require('semver')

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

  const { config } = service.ifError('prometheus', opts)
  const { port, path, host } = config
  const server = new Server({ host, port })

  prometheus.register.clear()
  prometheus.collectDefaultMetrics()
  // if (!prometheus.register.getSingleMetric('application_version_info')) {
  //   const { version, major, minor, patch } = semver.parse(options.version)
  //   const appVersion = new prometheus.Gauge({
  //     name: 'application_version_info',
  //     help: 'application version info',
  //     labelNames: ['version', 'major', 'minor', 'patch']
  //   })
  //   appVersion.labels(`v${version}`, major, minor, patch).set(1)
  // }

  server.route({ method: 'GET', path, handler: () => {
    // h: ResponseToolkit
    // const data = prometheus.register.metrics()
    // const res = h.response(data)
    // res.header('Content-Type', prometheus.register.contentType)
    // return res
    return prometheus.register.metrics()
  }})

  // 2do: catch amqp/http/...? requests converting them into metrics

  service.prometheus = {}
  server.start().catch(err => {
    console.log(err)
    process.exit()
  })
}
