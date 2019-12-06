## Logger Plugin

### Info
| Parameter     | Value       |
|---------------|-------------|
| Name          | `logger`    |
| Type          | essential   |
| Priority      | 10          |
| Requirements  | [Validator](./validator.md) plugin should be enabled |

## Methods
| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, opts = {})` | Registers plugin for Microfleet `service` with provided `options`, exposes logger API to the Service |

## Lifecycle Methods
No lifecycle methods are set up.

## Exported Methods and Properties
These methods are available after Plugin initialization under the `service` namespace:

| Method | Description | 
|--------|-------------|
| `log`  | Instance methods of the `@microfleet/validation` validator. |
| `log.trace()` | Allows to add additional `schema` location with your custom schemas`. |
| `log.debug()` | Reference to `validator.validate` method. |
| `log.info()` | Reference to `validator.validateSync` method. |
| `log.warn()` | Reference to `validator.ifError` method. |
| `log.error()` | Reference to `validator.ifError` method. |
| `log.fatal()` | Reference to `validator.ifError` method. |

## Configuration
| Option | Type |  Default | Description |
|--------|------|----------|-------------|
| `defaultLogger` | boolean, Object | `false` | [Default logger configuration](#default-logger-configuration) |
| `debug` | boolean | `false` | Default logger: put log level down to `debug`, or else `info` will be used by default |
| `prettifyDefaultLogger` | boolean | `false` when `process.env.NODE_ENV` is `production` or `process.env.USER` is empty | Pretty print logs when `defaultLogger` is `true` |
| `options` | Object | see [defaults](#logger-options-defaults) | Logger options: https://getpino.io/#/docs/api?id=options | 
| `streams` | Object | `{}` | Streams configurations under respective keys. Supported options are: [sentry](https://docs.sentry.io/error-reporting/configuration/?platform=javascript) and [pretty](https://github.com/pinojs/pino-pretty#options) |

## Default logger configuration
When `true`, adds default logger stream that outputs to STDOUT: pretty printed when `prettifyDefaultLogger` is enabled or fast production-ready json logger.

Config `defaultLogger` option may hold:
* a `boolean` value which determines whether to enable or disable default logger
* an `object` which holds custom [compatible logger configuration](#compatible-logger-configuration)

### Compatible logger configuration
| Option  | Type |
|---------|------|
| `trace` | function |
| `debug` | function |
| `info` | function |
| `warn` | function |
| `error` | function |
| `fatal` | function |

### Logger options defaults
```json
{
  "redact": {
    "paths": [
      "headers.cookie",
      "headers.authentication",
      "params.password"
    ]
  }
}
```
