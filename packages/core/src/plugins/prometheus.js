"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const assert = require("assert");
const __1 = require("..");
const semver = require("semver");
const Bluebird = require("bluebird");
const prometheus = require("prom-client");
const usageError = `
if "prometheus" and "router" plugins are used together - you have to  manually configure router handlers:

const {
  default: metricObservability
} = require('@microfleet/core/lib/plugins/router/extensions/audit/metrics')
config.router.extensions.enabled = ["preRequest", "postResponse"]
config.router.extensions.register = [metricObservability()]

In future we expect to handle it automatically :)
`;
function createAppVersionMetric() {
    let metric = prometheus.register.getSingleMetric('application_version_info');
    if (!metric) {
        const originalVersion = __1.Microfleet.version;
        const pv = semver.parse(originalVersion);
        metric = new prometheus.Gauge({
            name: 'application_version_info',
            help: 'application version info',
            labelNames: ['version', 'major', 'minor', 'patch'],
        });
        if (pv) {
            metric.labels(`v${pv.version}`, String(pv.major), String(pv.minor), String(pv.patch)).inc(1);
        }
        else {
            metric.labels(`v${originalVersion}`).inc(1);
        }
    }
    return metric;
}
function createMethodsRequestsMetric(buckets) {
    let metric = prometheus.register.getSingleMetric('microfleet_request_duration_milliseconds');
    if (!metric) {
        metric = new prometheus.Histogram({
            buckets,
            name: 'microfleet_request_duration_milliseconds',
            help: 'duration histogram of microfleet route requests',
            labelNames: ['method', 'route', 'transport', 'statusCode'],
        });
    }
    return metric;
}
function createMetricHandler(prometheus, path) {
    return (req, res) => {
        if (req.method === 'GET' && req.url === path) {
            res.writeHead(200, { 'Content-Type': prometheus.register.contentType });
            res.write(prometheus.register.metrics());
        }
        else {
            res.writeHead(404, { 'Content-Type': prometheus.register.contentType });
            res.write('404 Not Found');
        }
        res.end();
    };
}
/**
 * Plugin Name
 */
exports.name = 'prometheus';
/**
 * Plugin Type
 */
exports.type = __1.PluginTypes.application;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 50;
/**
 * Attaches plugin to the MService class.
 * @param settings - prometheus settings
 */
function attach(opts = {}) {
    if (this.config.plugins.includes('router')) {
        const extensions = this.router.config.extensions || {};
        assert(extensions.enabled.includes('preRequest') && extensions.enabled.includes('postResponse'), usageError);
    }
    this.prometheus = prometheus;
    const { config } = this.validator.ifError(exports.name, opts);
    const { port, path, durationBuckets } = config;
    // register default metrics
    prometheus.register.clear();
    prometheus.collectDefaultMetrics();
    // register service version metric
    createAppVersionMetric();
    // register methods latency histogram
    this.metricMicrofleetDuration = createMethodsRequestsMetric(durationBuckets);
    // handle metric requests
    const server = http_1.createServer(createMetricHandler(prometheus, path));
    return {
        async connect() {
            let resolve;
            let reject;
            const listen = new Promise((_resolve, _reject) => {
                resolve = _resolve;
                reject = _reject;
            });
            try {
                server.once('listening', resolve);
                server.once('error', reject);
                server.listen(port);
                await listen;
            }
            finally {
                server.removeListener('listening', resolve);
                server.removeListener('error', reject);
            }
        },
        async close() {
            await Bluebird.fromCallback(next => server.close(next));
        },
    };
}
exports.attach = attach;
//# sourceMappingURL=prometheus.js.map