#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

const { resolve } = require('node:path')
const parser = require('yargs-parser')

async function loadAny(loaders) {
  const errors = []
  for (const loader of loaders) {
    try {
      return await loader()
    } catch (e) {
      errors.push(e)
    }
  }

  for (const [idx, err] of errors.entries()) {
    console.error('Loader %d\n-----', idx)
    console.error(err)
  }

  process.exit(128)
}

!(async () => {
  const argv = parser(process.argv.slice(2))

  // prepare variables
  const cwd = argv.cwd || process.cwd()
  const source = argv.src ? resolve(cwd, argv.src) : resolve(cwd, 'src')
  const prop = argv.prop || 'default'

  const Service = await loadAny([
    () => require(source)[prop],
    () => require(cwd)[prop],
    () => import(source).then(x => x[prop]),
    () => import(cwd).then(x => x[prop]),
  ])

  // init service as there is no top-level async/await
  const service = Service[Symbol.toStringTag] === 'AsyncFunction'
    ? await Service()
    : new Service()

  await service.connect()

  service.log.info('service started')
})().catch((err) => {
  console.error(err)
  process.exit(128)
})
