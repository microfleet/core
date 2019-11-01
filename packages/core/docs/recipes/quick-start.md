# Quick start guide

## Installation
Install core and essential deps:
```sh
yarn add @microfleet/core uuid common-errors @microfleet/transport-amqp @microfleet/validation @hapi/hapi
```

Create an `index.js` file under `src` directory:
```js
//src/index.js
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

Set this file as a primary entry point in `package.json`:
```json
{
  //...
  "main": "src/index.js",
  //...
}
```

Let's check that you have installed all the necessary dependencies and try to start the server:

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
       extensions: { register: [] }, // this line disables some core features that we don't need yet
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

Start the service
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

Create a directory for tests from your project root:
```sh
$ mkdir test
```

## Ensure the service starts

Create file `test/demo.js`:
```js
const DemoApp = require('../src');

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

## Ensure the service is able to greet the world

```sh
yarn add -D request request-promise
```

Add a test to `test/demo.js`:
```js
// test/demo.js
const rp = require('request-promise');
const assert = require('assert');
const DemoApp = require('../src'); 

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

Check it out by running:
```sh
yarn test
```

# Next steps
- [Configuration](configuration.md)
