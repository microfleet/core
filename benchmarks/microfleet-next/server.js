const { resolve } = require('path')
const { Microfleet } = require('../../packages/core')

const server = new Microfleet({
  name: 'tester',
  plugins: [
    'logger',
    'validator',
    'hapi',
    'router',
    'router-hapi',
  ],
  router: {
    routes: {
      directory: resolve(__dirname, './actions'),
    },
  },
  hapi: {
    server: {
      port: 3000,
    },
  },
})

server.connect()
