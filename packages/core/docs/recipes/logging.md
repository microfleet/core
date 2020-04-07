# Logging

## Prerequisites
We assume that you have:
* Set up the service: [quick start recipe](./quick-start.md)
* Structured it as we recommend: [structure](./structure.md)

Logger plugin is essential and enabled by default. When your application is running in environment other than`production`, logger plugin uses pretty print format for your logs and outputs it to the STDOUT.


Start the service
```sh
yarn mfleet
```

This should print:
```sh
yarn run v1.16.0
$ mfleet
[...] INFO  (demo-app/8832 on you.local): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
[...] INFO  (demo-app/8832 on you.local): service started
```

While in production it outputs json logs:
```
NODE_ENV=production yarn mfleet
```

This should print:
```sh
yarn run v1.16.0
$ mfleet
{"level":30,"time":1575570742948,"pid":72935,"hostname":"you.local","name":"demo-app","pluginName":"http","connectorType":"transport","msg":"ready","v":1}
{"level":30,"time":1575570743009,"pid":72935,"hostname":"you.local","name":"demo-app","transport":"http","http":"@hapi/hapi","msg":"listening on http://0.0.0.0:3000","v":1}
{"level":30,"time":1575570743009,"pid":72935,"hostname":"you.local","name":"demo-app","pluginName":"http","connectorType":"transport","msg":"ready","v":1}
{"level":30,"time":1575570743009,"pid":72935,"hostname":"you.local","name":"demo-app","msg":"service started","v":1}
```

## Recipes
- [Logging to Sentry](#logging-to-sentry)
  - [Event Fingerprinting](#event-fingerprinting)
- [Custom logger](#custom-logger)
- [Enable debug for default logger](#enable-debug-for-default-logger)

### Logging to Sentry
Enable Sentry stream in the logger plugin config:
```js
// src/configs/logger.js
exports.logger = {
  defaultLogger: false,
  streams: {
    sentry: {
      dsn: 'https://3736a7965d59423c867105ee4ba47de2@sentry.io/137605', // Paste your DSN secret
      logLevel: 'info', // `error` is enabled by default
    }
  }
}
```
For each log message Logger captures event into Sentry.

#### Event Fingerprinting
All Sentry events have a fingerprint. Events with the same fingerprint are grouped together into an issue. By default, 
Sentry will generate a fingerprint based on information available within the event such as stacktrace, exception, and 
message. We support 
[Sentry SDK event fingerprinting](https://docs.sentry.io/data-management/event-grouping/sdk-fingerprinting/?platform=node).
Fingerprint is represented as an array of strings. Pass it as `$fingerprint` when logging a message:
```js
// src/actions/deprecated-action.js
const { ActionTransport } = require('@microfleet/core')
const { FINGERPRINT_DEFAULT } = require('@microfleet/core/lib/plugins/logger/streams/sentry')

function deprecatedAction({ params: { clientId }}) {
  this.log.warn(
    {
      $fingerprint: [
        FINGERPRINT_DEFAULT, // '{{ default }}' -- for more reserved fingerprint names explore Sentry docs
        String(clientId),
      ]
    },
    'Deprecated API Usage'
  )
  
  // ...
  
  return { status: 'ok' }
}

deprecatedAction.transports = [ActionTransport.http]

module.exports = deprecatedAction
```

### Custom logger
[WIP]

### Enable debug for default logger
By default, log level is `info`. Extend it to `debug`:  
```js
// src/configs/logger.js
exports.logger = {
  defaultLogger: true,
  debug: true,
}
```

