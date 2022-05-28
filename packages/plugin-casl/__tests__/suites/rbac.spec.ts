import { resolve } from 'path'
import sinon from 'sinon'
import assert from 'assert'

import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

describe('#Casl RBAC plugin', () => {
  let service: Microfleet
  const strategyStub = sinon.stub()

  beforeEach(async () => {
    service = new Microfleet({
      name: 'rbac-service',
      plugins: [
        'validator',
        'logger',
        'amqp',
        'router',
        'router-amqp',
        'casl'
      ],
      validator: {
        schemas: [resolve(__dirname, '../artifacts/schemas')]
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
        auth: {
          strategies: {
            token: strategyStub,
          },
        },
        extensions: {
          register: []
        }
      }
    })

    await service.connect()
  })

  afterEach(async () => {
    if (service) {
      await service.close()
    }
  })

  describe('#action config', () => {
    it('should verify action permissions', async () => {
      strategyStub.callsFake(async (request: ServiceRequest) => {
        request.auth = {
          credentials: {},
          scopes: [{
            action: 'some',
            subject: 'xxbb'
          }],
        }
      })

      await assert.rejects(
        service.dispatch('protected', {
          params: {
            foo: 1,
          }
        }),
        /cannot execute action 'read' on 'my-subject'/
      )
    })

    it('should allow action', async () => {
      const scopes =  [{
        action: 'read',
        subject: 'my-subject'
      }]

      strategyStub.callsFake(async (request: ServiceRequest) => {
        request.auth = {
          credentials: {},
          scopes,
        }
      })

      const response = await service.dispatch('protected', {
        params: {
          foo: 1,
        }
      })

      assert.deepStrictEqual(response.user.scopes, scopes)
    })
  })
})
