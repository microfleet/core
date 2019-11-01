# Configuration
Once you've [started](quick-start.md) your first Microfleet service, you're ready to play with its configuration.
You may always look into the [reference](../reference.md) to find some specific option description.

## Table of Contents
- [Access config within an action handler](#access-config-within-an-action-handler)
- [Pass custom options through the service constructor](#pass-custom-options-through-the-service-constructor)
- [Store config in the environment](#store-config-in-the-environment)
- [Recommended config files location](#recommended-config-files-location)
- [Set default opts for specific environment](#set-default-opts-for-specific-environment)
- [Testing](#testing)

## Access config within an action handler
Service config is accessible with `this.config`. Let's create an action handler that prints the config as pretty JSON:
```js
// src/actions/configuration.js
const { ActionTransport } = require('@microfleet/core')

function getConfigurationAction() {
  return JSON.stringify(this.config, null, 2)
}

getConfigurationAction.transports = [ActionTransport.http]

module.exports = getConfigurationAction
```

Start the service:
```sh
yarn mfleet
```

Request the action:
```sh
curl -X GET localhost:3000/configuration
```

This should print current config. Take some time to explore it:
```
{
  "validator": {
    "schemas": [],
    "serviceConfigSchemaIds": [
      "microfleet.core",
      "config"
    ],
    "filter": null,
    "ajv": {
      "strictKeywords": true
    }
  },
  "logger": {
    "debug": true,
    "defaultLogger": true
  },
  "plugins": [
    "validator",
    "logger",
    "router",
    "http"
  ],
  "router": {
    "routes": {
      "directory": "/Users/root/demo-app/src/actions",
      "enabled": {
        "configuration": "configuration",
        "demo": "demo",
        "/Users/root/demo-app/node_modules/@microfleet/core/lib/plugins/router/routes/generic/health": "generic.health"
      },
      "prefix": "",
      "setTransportsAsDefault": true,
      "transports": [
        "http"
      ],
      "enabledGenericActions": [
        "health"
      ]
    },
    "extensions": {
      "enabled": [
        "postRequest",
        "preRequest",
        "preResponse"
      ],
      "register": []
    },
    "auth": {
      "strategies": {}
    }
  },
  "http": {
    "server": {
      "handler": "hapi",
      "attachSocketIO": false,
      "port": 3000,
      "handlerConfig": {
        "server": {
          "address": "0.0.0.0",
          "port": 3000
        },
        "plugins": {
          "list": []
        }
      },
      "host": "0.0.0.0"
    },
    "router": {
      "enabled": true,
      "prefix": ""
    }
  },
  "hooks": {},
  "amqp": {
    "transport": {},
    "router": {
      "enabled": false
    }
  },
  "sigterm": true,
  "opentracing": {
    "config": {
      "disable": true,
      "serviceName": "microfleet"
    }
  },
  "prometheus": {
    "config": {
      "port": 9102,
      "path": "/metrics"
    }
  },
  "healthChecks": {
    "interval": 500,
    "max_tries": 3
  },
  "name": "demo-app",
  "maintenanceMode": false
}
```

## Pass custom options through the service constructor
In the [quick start guide](quick-start.md) we've defined the config right within the service constructor, but naturally 
we need to make it dynamic and extensible, let's pass custom options as an argument:
```js
// src/index.js
const { Microfleet, ActionTransport } = require('@microfleet/core')
const merge = require('lodash/merge')

const defaultOpts = {
  name: 'demo-app',
  router: {
    extensions: { register: [] },
  },
}

class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, defaultOpts, opts))
  }
}
```

Now you're able to set custom options, which might be handy for testing purposes.

## Store config in the environment   
The config could keep some sensitive data like credentials and is likely to vary between deploys due to different 
environments. We don't want to compromise credentials nor change the code each time when the environment changes. 
Therefore it is considered as a best practice to separate the config from the code and pass it as environment
variables.
In **@microfleet** microservices we use [ms-conf](https://www.npmjs.com/package/ms-conf) module to manage configs. It 
processes env configuration. Each value is parsed as JSON first if possible, so you can pass arrays, objects and 
boolean params through env.
Let's bring this practice to our app.
1. Install `ms-conf` module:
```sh
npm i ms-conf -S
```
or
```sh
yarn add ms-conf
```

2. Set up the `.env` file. `NCONF_NAMESPACE` value is required to return configuration relative to this namespace.
Fill it with data, for now let it be dummy:
```
NCONF_NAMESPACE=DEMO_APP_CONF
DEMO_APP_CONF__APP__SOME_SECRET=i-am-very-secret
DEMO_APP_CONF__APP__SOME_ENV_DEPENDENT_VALUES="{"replyTo":"info-production@demo.com"}"
```

We expect it to result in config:
```json
{
  "app": {
    "someSecret": "i-am-very-secret",
    "someEnvDependentValues": {
      "replyTo": "info-production@demo.com"
    }
  }
}
```

3. Move the config out, locate it in `src/config.js` for now:
```js
// src/config.js
module.exports = {
  name: 'demo-app',
  router: {
    extensions: { register: [] },
  }
}
```

4. Require `ms-conf`, prepend default configuration.
```js
// src/index.js
const { Microfleet, ActionTransport } = require('@microfleet/core')
const path = require('path')
const merge = require('lodash/merge')
const confidence = require('ms-conf')

confidence.prependDefaultConfiguration(path.resolve(__dirname, './config.js'))
const config = confidence.get('/')

class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, config, opts))
  }
}

module.exports = DemoApp
```

Start the service:
```sh
yarn mfleet
```

Ensure that printed result includes those ones provided with `env`:
```sh
curl -X GET localhost:3000/configuration
```

Response should include this part:
```sh
...
  "name": "demo-app",
  "app": {
    "someSecret": "i-am-very-secret",
    "someEnvDependentValues": {
      "replyTo": "info-production@demo.com"
    }
  },
...
```

## Recommended config files location
Let's shape it! Check out recommended config files location at the [structure recipe](structure.md).

Create a folder `configs`, with files:
1. Core config:
```js
// src/configs/core.js
exports.name = 'demo-app';
```
2. Router config:
```js
// src/configs/router.js
exports.router = {
  extensions: { register: [] },
}
```

Prepend all config files from the `configs` directory in `src/config.js`:
```js
// src/config.js
const confidence = require('ms-conf')
const path = require('path')

confidence.prependDefaultConfiguration(path.resolve(__dirname, './configs'))

module.exports = confidence
```

Require `config` in `src/index.js`:
```js
// src/index.js
const { Microfleet, ActionTransport } = require('@microfleet/core')
const config = require('./config')
const defaultOpts = config.get('/')

class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, defaultOpts, opts))
  }
}

module.exports = DemoApp
```

## Set default opts for specific environment
Let the secret be a secret!
The [ms-conf](https://www.npmjs.com/package/ms-conf) allows us to preset values depending on options.
Let's set up an option `env`, passing the `process.env.NODE_ENV` variable:
```js
// src/index.js
const { Microfleet, ActionTransport } = require('@microfleet/core')
const config = require('./config')

// look!
const defaultOpts = config.get('/', { env: process.env.NODE_ENV })

class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, defaultOpts, opts))
  }
}

module.exports = DemoApp
```

Define a `$filter` for `app.someSecret` config value:
```js
// src/config.js
module.exports = {
  name: 'demo-app',
  router: {
    extensions: { register: [] },
  },
  app: {
    someSecret: {
      $filter: 'env',
      // we expect that production value would be passed in the production env so we leave it undefined
      test: 'i-am-NOT-a-secret',
      development: 'me-neither',
    }  
  }
}
```

Remove the `DEMO_APP_CONF__APP__SOME_SECRET` line from the `.env` file:
```sh
NCONF_NAMESPACE=DEMO_APP_CONF
DEMO_APP_CONF__APP__SOME_ENV_DEPENDENT_VALUES="{"replyTo":"info-production@demo.com"}"
```

Run your service in the `test` env:
```sh
NODE_ENV=test yarn mfleet
```

Make a request:
```
curl -X GET localhost:3000/configuration
```

Check out the response. `someSecret` value should contain default `test` env value:
```sh
...
"app": {
  "someSecret": "i-am-NOT-a-secret",
  "someEnvDependentValues": {
    "replyTo": "info-production@demo.com"
  }
},
...
```

## Testing
Now you are ready to run tests with `test` config values. Let's cover it with a test:
```js
// test/configuration.js
const assert = require('assert')
const rp = require('request-promise')
const DemoApp = require('../src')

describe('configuration', () => {
  it('should load configuration from env', async () => {
    const demoApp = new DemoApp()
    await demoApp.connect()

    try {
      const response = await rp({
        uri: 'http://0.0.0.0:3000/configuration',
        json: true,
      })

      assert.strictEqual(response.name, 'demo-app')
      assert.strictEqual(response.app.someSecret, 'i-am-NOT-a-secret')
      assert.deepStrictEqual(response.app.someEnvDependentValues, { replyTo: 'info-production@demo.com' })
    } finally {
      await demoApp.close()
    }
  })
})
```

Run tests:
```sh
NODE_ENV=test yarn test
```

Let it work! 
