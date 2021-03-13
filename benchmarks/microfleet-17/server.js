const { resolve } = require('path')
const { Microfleet } = require('@microfleet/core')

const server = new Microfleet({
  name: 'tester',
  plugins: [
    'logger',
    'validator',
    'router',
    'http',
  ],
  router: {
    routes: {
      directory: resolve(__dirname, './actions'),
    },
  },
})

server.connect()
