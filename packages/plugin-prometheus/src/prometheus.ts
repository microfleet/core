import { createServer, IncomingMessage, ServerResponse } from 'http'
import { strict as assert } from 'node:assert'
import { Microfleet } from '@microfleet/core'
import type { PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import semver from 'semver'
import Prometheus from 'prom-client'
import { NotFoundError } from 'common-errors'
import { once } from 'events'
import { resolve } from 'path'
import { metricObservability } from './metrics'
import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-router'

export interface Config {
  config: {
    port: number
    path: string
    durationBuckets: number[]
  }
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    prometheus: typeof Prometheus
    metricMicrofleetDuration: Prometheus.Histogram<string>
  }

  interface ConfigurationOptional {
    prometheus: Config
  }
}

function createAppVersionMetric() {
  let metric = Prometheus.register.getSingleMetric('application_version_info')
  if (!metric) {
    const originalVersion = Microfleet.version
    const pv = semver.parse(originalVersion)
    metric = new Prometheus.Gauge({
      name: 'application_version_info',
      help: 'application version info',
      labelNames: ['version', 'major', 'minor', 'patch'],
    })

    if (pv) {
      metric.labels(`v${pv.version}`, String(pv.major), String(pv.minor), String(pv.patch)).inc(1)
    } else {
      metric.labels(`v${originalVersion}`).inc(1)
    }
  }
  return metric
}

function metricIsHistogram(metric: any): metric is Prometheus.Histogram<string> {
  return metric && typeof metric.observe === 'function'
}

function createMethodsRequestsMetric(buckets: number[]): Prometheus.Histogram<string> {
  const metric = Prometheus.register.getSingleMetric('microfleet_request_duration_milliseconds')

  if (!metricIsHistogram(metric)) {
    return new Prometheus.Histogram({
      buckets,
      name: 'microfleet_request_duration_milliseconds',
      help: 'duration histogram of microfleet route requests',
      labelNames: ['method', 'route', 'transport', 'statusCode'],
    })
  }

  return metric
}

function createMetricHandler(path: string) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && req.url === path) {
      try {
        const metrics = await Prometheus.register.metrics()
        res.writeHead(200, { 'Content-Type': Prometheus.register.contentType })
        res.end(metrics)
      } catch (e: any) {
        res.writeHead(500, { 'Content-Type': Prometheus.register.contentType })
        res.end('500 Internal Error')
      }
      return
    }

    res.writeHead(404, { 'Content-Type': Prometheus.register.contentType })
    res.end('404 Not Found')
  }
}


/**
 * Plugin Name
 */
export const name = 'prometheus'

/**
 * Plugin Type
 */
export const type = PluginTypes.transport

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 50


/**
 * Attaches plugin to the MService class.
 * @param settings - prometheus settings
 */
export async function attach(this: Microfleet, opts: Partial<Config> = {}): Promise<PluginInterface> {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  if (this.hasPlugin('router')) {
    this.config.router.extensions.register.push(metricObservability)
  }

  const { config } = this.validator.ifError<Config>(name, opts)
  const { port, path, durationBuckets } = config

  // register default metrics
  this.prometheus = Prometheus
  Prometheus.register.clear()
  Prometheus.collectDefaultMetrics()

  // register service version metric
  createAppVersionMetric()

  // register methods latency histogram
  this.metricMicrofleetDuration = createMethodsRequestsMetric(durationBuckets)

  // handle metric requests
  const server = createServer(createMetricHandler(path))

  return {
    async connect() {
      await Promise.all([once(server, 'listening'), server.listen(port)])
    },

    async close() {
      if (!server.listening) {
        return
      }

      return new Promise<void>((resolve, reject) => {
        server.close((err) => err ? reject(err) : resolve())
      })
    },
  }
}
