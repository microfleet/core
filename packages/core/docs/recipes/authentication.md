# Authentication

## Before start

This recipe assumes that you are already familiar with the [quick start guide](quick-start.md) and the [configuration](configuration.md) recipe.

## Configuring Authentication

#### Configure strategy

```sh
└── src                              # application source code
    └── auth                         # authentication strategies directory
        ├── index.js                 # exports strategies
        └── strategies
            └── demo.js      # demo strategy
```

```js
// demo.js
const { HttpStatusError } = require('common-errors')

const { REQUIRED_STRATEGY } = require('../../constants')

const users = {
  1: {
    id: 1,
    name: 'Demo User',
  },
}

function verifyToken(authType, token) {
  if (authType !== 'Bearer') {
    throw new HttpStatusError(403, 'Invalid auth type')
  }

  const [body, userId] = token.split(':', 2)

  if (body !== 'demo' || !userId) {
    throw new HttpStatusError(403, 'Malformed Token')
  }

  return userId
}

function demo(request) {
  const { action } = request
  const { auth } = action
  const { strategy = REQUIRED_STRATEGY } = auth
  const { authorization } = request.headers

  if (strategy === REQUIRED_STRATEGY && !authorization) {
    throw new HttpStatusError(401, 'Credentials Required')
  }

  const [authType, token] = authorization.split(/\s+/, 2) // Authorization: Bearer [token]

  if (!auth || !token) {
    throw new HttpStatusError(403, 'Invalid Token')
  }

  const userId = verifyToken(authType, token)
  const user = users[userId]

  if (!user) {
    throw new HttpStatusError(401, 'You don\'t have permission to access')
  }

  return { user }
}

module.exports = demo
```

#### Define strategies in config

config.js
```
const { demo } = require('./auth')

module.exports = {
  ...
  router: {
    ...
    auth: {
      strategies: { demo }
    }
  }
  ...
}

```


#### Configure Action

Define action option `auth`: 

```js
const { ActionTransport } = require('@microfleet/core')

function protectedAction(request) {
  const { user } = request.auth.credentials
  return `Hello, world by ${user.name}!`
}

protectedAction.auth = {
  name: 'demo',
}
protectedAction.transports = [ActionTransport.http]

module.exports = protectedAction
```

## Ensure the service is able to greet the world

Add a test to `test/protected.js`:
```js
const assert = require('assert')
const rp = require('request-promise')
const DemoApp = require('../src')

describe('Server process protected action:', () => {
  const demoApp = new DemoApp()

  before(() => demoApp.connect())
  after(() => demoApp.close())

  it('allow with valid credentials', async () => {
    const response = await rp({
      uri: 'http://0.0.0.0:3000/protected',
      headers: {
        authorization: 'Bearer demo:1',
      },
    })

    assert.strictEqual(response, 'Hello, world by Demo User!')
  })

  it('reject without credentials', async () => {
    const request = rp({
      uri: 'http://0.0.0.0:3000/protected',
    })

    await assert.rejects(request)
  })

  it('reject with invalid credentials', async () => {
    const request = rp({
      uri: 'http://0.0.0.0:3000/protected',
      headers: {
        authorization: 'invalid-token',
      },
    })

    await assert.rejects(request)
  })
})
```
