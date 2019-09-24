# Quick start guide

## Installation
Install core and essential deps:
```sh
yarn add @microfleet/core uuid common-errors @microfleet/transport-amqp @microfleet/validation @hapi/hapi
```

Create an `index.js` file under `src` directory:
```js
const { Microfleet } = require('@microfleet/core');

class DemoApp extends Microfleet {
 constructor() {
   super({
     name: 'demo-app',
   });
 }
}

module.exports = DemoApp;
```

Let's check that you have installed all necessary dependencies and try to start the server:
```sh
yarn mfleet
```

This should print:
```sh
yarn run v1.16.0
$ ~/demo-app/node_modules/.bin/mfleet
[...] INFO  (demo-app/92477 on you.local): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
[...] INFO  (demo-app/92477 on you.local): service started
```

## Configuring the app

src/index.js:
```js
const { Microfleet, ActionTransport } = require('@microfleet/core');
const path = require('path');

class DemoApp extends Microfleet {
 constructor() {
   super({
     name: 'demo-app',
     router: {
       routes: {
         directory: path.resolve(__dirname, './actions'),
         transports: [ActionTransport.http],
       },
     },
     http: {
       server: {
         handler: 'hapi',
       },
       router: {
         enabled: true,
       },
     },
   });
 }
}

module.exports = DemoApp;
```

src/actions/demo.js
```js
const { ActionTransport } = require('@microfleet/core');

function demoAction() {
  return 'Hello, world!\n';
}

demoAction.transports = [ActionTransport.http];

module.exports = demoAction;
```

Start service
```sh
yarn mfleet
```

This should print:
```sh
yarn run v1.16.0
$ ~/demo-app/node_modules/.bin/mfleet
[...] INFO  (demo-app/8832 on you.local): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
[...] INFO  (demo-app/8832 on you.local): service started
```

Make your first request:
```sh
curl -X GET localhost:3000/demo
```
This should print:
```
Hello, world!
```

# Testing
Install [Mocha testing library](https://mochajs.org):
```sh
yarn add -D mocha
```

Create directory for tests from your project root:
```sh
$ mkdir test
```

## Ensure service starts

Create file `demo.js`:
```js
const DemoApp = require('../index');

describe('server', () => {
  it('should be able to start', async () => {
    const demoApp = new DemoApp();
    await demoApp.connect();
    await demoApp.close();
  });
});
```

Run:
```sh
$ ./node_modules/mocha/bin/mocha
```

This should print:
```sh
 server
[...] INFO  (demo-app/6714 on you.local): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
    ✓ should be able to start (611ms)


  1 passing (619ms)
```

Add `test` script to the `package.json`:
```
"scripts": {
  "test": "mocha"
}
```

Run once again:
```sh
yarn test
```

## Ensure service is able to greet the world
```sh
yarn add -D request-promise
yarn add -D request
```

Add a test:
```js
// demo.js
const rp = require('request-promise');
const assert = require('assert');

describe('server', () => {
  // it('should be able to start', async () => {...}); 
  
  it('should say hello world', async () => {
      const demoApp = new DemoApp();
      await demoApp.connect();
  
      try {
        const response = await rp({
          uri: 'http://0.0.0.0:3000/demo',
        });
        assert(response, 'Hello, world');
      } finally {
        await demoApp.close();
      }
    });
});
```

Check it out bu running:
```sh
yarn test
```
