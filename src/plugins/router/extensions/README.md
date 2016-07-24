# Extensions

`Extensions` module adds the ability to register `extension` to lifecycle. 
`Extension` is a function that returns `Promise`

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

## API

`new Extension(config)`

* `config` - configuration object
    * `enabled` - an array of enabled extensions
    * `register` - an object that contains a set of auto-registered extensions

`Extension.exec(name, args = [], context)`

* `name` - a name of extension
* `args` - an array of arguments passed to extension handlers
* `context` - `this` context of extension handlers
