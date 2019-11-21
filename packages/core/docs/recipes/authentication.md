# Authentication

## Requirements

This recipe assumes that you are already familiar with the [quick start guide](quick-start.md) and the [configuration](configuration.md) recipe.

## Configuring Authentication

#### Define strategy

Define function `demo`, she will serve as auth middleware. We can check request credentials and identify user. Function accepts request argument and return user credentials.

```js
function demo(request) {
  const { action } = request
  const { auth } = action
  const { strategy = REQUIRED_STRATEGY } = auth
  const { authorization } = request.headers
  
  /* validate request credentials */
  /* identify user */
  
  return {} // return object with user data
}
```

Completed strategy:
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

#### Save strategy

```sh
└── src                              # application source code
    └── auth                         # authentication strategies directory
        ├── index.js                 # exports strategies
        └── strategies
            └── demo.js      # demo strategy
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
protectedAction.auth = {
  name: 'demo',
}
```

Completed action:
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

In action we have access to user data, returned by strategy in `request.auth.credentials`.

## Ensure that the Authentication is working

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
