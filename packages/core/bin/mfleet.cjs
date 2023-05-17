#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { resolve } = require('node:path')
const parser = require('yargs-parser')

!(async () => {
  const argv = parser(process.argv.slice(2))

  // prepare variables
  const cwd = argv.cwd || process.cwd()
  const source = argv.src ? resolve(cwd, argv.src) : resolve(cwd, '/src')
  const prop = argv.prop || 'default'

  let Service
  try {
    Service = await import(source).then(x => x[prop])
  } catch (e) {
    // use package.json -> main
    Service = await import(cwd).then(x => x[prop])
  }

  // init service as there is no top-level async/await
  const service = Service[Symbol.toStringTag] === 'AsyncFunction'
    ? await Service()
    : new Service()

  try {
    await service.connect()
  } catch (err) {
    service.log.fatal({ err }, 'service crashed')
    throw err
  }

  service.log.info('service started')
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(128)
})
