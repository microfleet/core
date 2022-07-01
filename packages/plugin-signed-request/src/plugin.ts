import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'

import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { Config } from './types'
import { resolve } from 'path'
import { HapiSignedRequestPlugin } from './hapi'
import { extendServiceRequest } from './router-extension'

export const name = 'httpSignedRequest'
export const type = PluginTypes.transport
export const priority = 31

export function attach(
  this: Microfleet,
  options: Partial<Config> = {}
) {
  assert(this.hasPlugin('validator'), 'validator plugin must be included')
  assert(this.hasPlugin('routerHapi'), 'router-hapi plugin must be included')


  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<Config>('http-signed-request', options)

  if (this.hasPlugin('router')) {
    this.router.lifecycle.addHook(extendServiceRequest)
  }

  return {
    connect(this: Microfleet) {
      assert(this.credentialsStore, 'credentials store should be initialized')
      this.hapi.register(HapiSignedRequestPlugin(this.credentialsStore, config))
    }
  }
}
