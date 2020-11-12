# @microfleet/plugin-hapi

## Usage

```js
const service = new Microfleet({
  name: 'http-server',
  plugins: [
    'validator', // essensial plugin
    'logger', // essensial plugin
    'hapi',
  ],
  hapi: {
    // server: Hapi server options
    // plugins: list of plugins
    // views: list of views (e.g. html templates)
  }
})

await service.connect()

// service.hapi -- instance of Hapi server
```
