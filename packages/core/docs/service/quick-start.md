# Quick start guide

Install core and essential deps:
```sh
yarn add @microfleet/core uuid common-errors @microfleet/transport-amqp @microfleet/validation @hapi/hapi
```

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
$ /Users/belkinadasha/Projects/microfleet-demo-app/node_modules/.bin/mfleet
[2019-08-30 14:50:10.198 +0000] INFO  (demo-app/8832 on you.local): listening on http://0.0.0.0:3000
    transport: "http"
    http: "@hapi/hapi"
[2019-08-30 14:50:10.207 +0000] INFO  (demo-app/8832 on you.local): service started
```

Make your first request:
```sh
curl -X GET localhost:3000/demo
```
This should print:
```
Hello, world!
```

