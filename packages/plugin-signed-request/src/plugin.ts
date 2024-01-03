import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'

import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { Config } from './types'
import { resolve } from 'path'
import { HapiSignedRequestPlugin } from './plugins/hapi'
import { extendServiceRequest } from './router-extension'
import { PluginInterface } from '@microfleet/core-types'

export const name = 'signedRequest'
export const type = PluginTypes.transport
export const priority = 31

export async function attach(this: Microfleet, options: Partial<Config> = {}): Promise<PluginInterface> {
  assert(this.hasPlugin('validator'), 'validator plugin must be included')
  assert(this.hasPlugin('routerHapi'), 'router-hapi plugin must be included')

  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<Config>('signed-request', options)

  if (this.hasPlugin('router')) {
    this.router.lifecycle.addHook(extendServiceRequest)
  }

  return {
    async connect(this: Microfleet) {
      assert(this.credentialsStore, 'credentials store should be initialized')
      this.hapi.register(HapiSignedRequestPlugin(this.credentialsStore, config))
    }
  }
}
