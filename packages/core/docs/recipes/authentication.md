# Authentication

## Before start

First of all, you must go through Quick Start.

## Configuring Authentication

#### Configure strategy

```sh
└── src                              # application source code
    └── auth                         # authentication strategies directory
        ├── index.js                 # exports strategies
        └── strategies
            └── demoStrategy.js      # demo strategy
```

```js
// demoStrategy.js
const { HttpStatusError } = require('common-errors');

function verifyToken(token) {
  const validToken = !!token; // check token structure, check token on exist

  if (!validToken) {
    throw new HttpStatusError(403, 'Invalid Token');
  }
}

function demoStrategy(request) {
  const { action } = request;
  const { auth } = action;
  const { strategy = 'required' } = auth;
  const { authorization } = request.headers;

  if (authorization) {
    const [auth, token] = authorization.split(/\s+/, 2); // Authorization: Bearer [token]
    return verifyToken(token)
  }

  if (strategy === 'required') {
    throw new HttpStatusError(401, 'Credentials Required');
  }
}

module.exports = demoStrategy;
```

#### Define strategies in config

config.js
```
const { demoStrategy } = require('./auth');

const config = {
  name: 'demo-app',
  router: {
    extensions: { register: [] },
    auth: {
      strategies: { demoStrategy },
    },
  },
}
```


#### Configure Action

Define action option `auth`: 

```js
ProtectedAction.auth = {
  name: 'demoStrategy', // name of strategy defined in src/auth/strategies
  strategy: 'required', // default is required, also can be try. That can allow to skip authentificate
  passAuthError: true, // allow to handle auth error ???
}
```

## Ensure the service is able to greet the world

Add a test to `test/protected.js`:
```js
const assert = require('assert');
const rp = require('request-promise');
const DemoApp = require('../src');

describe('Server process protected action:', () => {
  const demoApp = new DemoApp();

  before(() => demoApp.connect());
  after(() => demoApp.close());

  it('allow with valid credentials', async () => {
    const response = await rp({
      uri: 'http://0.0.0.0:3000/protected',
      headers: {
        authorization: `Bearer some-valid-token`
      }
    });

    assert(response);
  });

  it('reject without credentials', async () => {
    const request = rp({
      uri: 'http://0.0.0.0:3000/protected',
    });

    await assert.rejects(request, 'Credentials Required');
  });

  it('reject with invalid credentials', async () => {
    const request = rp({
      uri: 'http://0.0.0.0:3000/protected',
      headers: {
        authorization: `invalid-token`
      }
    });

    await assert.rejects(request, 'Invalid Token');
  });
});

```
