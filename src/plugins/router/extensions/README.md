# Extensions

`Extensions` module adds the ability to register 
`extension` to lifecycle. `Extension` is a function 
that returns `Promise`

## Usage

```js
const Extensions = require('./extensions');
const config = {
  enabled: [
    'preHandler'
    'postHandler'
  ],
  register: {
    'postHandler': result => Promise.reject(result)
  }
};

const extensions = new Extensions(config);
extensions.register('preHandler', args => Promise.resolve(args));
// ...
const promise = extensions.exec('preHandler');
// ...
const promise = extensions.exec('postHandler');
```
