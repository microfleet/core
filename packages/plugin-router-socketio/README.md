# Microfleet plugin-router-socketio

Attach socket.io transport to router.

## Typical usage

```js
const service = new Microfleet({
  name: 'tester',
  plugins: [
    'validator', // essential plugin
    'logger', // essential plugin
    'socketio', // init socket.io
    'http', // init http and attach socket.io
    'router', // init router
    'router-socketio' // attach socket.io transport to router
  ],
  http: {
    server: {
      attachSocketio: true,
    },
  },
})
```
