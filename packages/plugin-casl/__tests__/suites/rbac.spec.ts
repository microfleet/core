import { resolve } from 'path'
import sinon from 'sinon'
import { strict as assert } from 'assert'

import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

describe('#Casl RBAC plugin', () => {
  let service: Microfleet
  const strategyStub = sinon.stub()

  beforeAll(async () => {
    service = new Microfleet({
      name: 'rbac-service',
      plugins: [
        'validator',
        'logger',
        'amqp',
        'router',
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
      },
      rbac: {
        anyAction: 'x-manage',
        anySubjectType: 'x-all',
        actions: {
          'x-access': ['read', 'write', 'update', 'delete']
        },
        abilities: {
          'admin-ability': [
            {
              subject: 'x-all',
              action: 'x-access',
            }
          ],
          'foo-ability': [
            {
              subject: 'foo',
              action: 'manage'
            }
          ]
        },
        detectSubjectType: (obj) => obj.type
      }
    })

    await service.connect()
  })

  afterAll(async () => {
    if (service) {
      await service.close()
    }
  })

  describe('#direct usage', () => {
    it('panics on unknown ability', async () => {
      assert.rejects(
        async () => {
          service.rbac.get('unknown-ability')
        },
        { message: "'unknown-ability' ability does not exists in configuration" }
      )
    })

    it('uses subjectDetector', async () => {
      const { rbac } = service
      const ability = rbac.get('foo-ability')

      assert.strictEqual(rbac.can(ability, 'manage', { type: 'foo' }), true)
      assert.strictEqual(rbac.can(ability, 'manage', { type: 'bar' }), false)
    })

    it('allows to override subject', async () => {
      const { rbac } = service
      const ability = rbac.get('foo-ability')

      assert.strictEqual(rbac.canSubject(ability, 'manage', 'foo', {}), true)
      assert.strictEqual(rbac.canSubject(ability, 'manage', 'bar', {}), false)
    })
  })

  describe('#action config', () => {
    describe('flat action', () => {
      it('should not allow action execution', async () => {
        const testScopes = [
          [{ action: 'some', subject: 'xxbb' }],
          [{ action: 'read', subject: 'my-subject', inverted: true }],
          [
            { action: 'x-access', subject: 'my-subject' },
            { action: 'read', subject: 'my-subject', inverted: true },
          ],
        ]

        for (const scopes of testScopes) {
          strategyStub.callsFake(async (request: ServiceRequest) => {
            request.auth = { credentials: {}, scopes }
          })

          await assert.rejects(
            service.dispatch('protected', {
              params: {
                foo: 1,
              }
            }),
            /cannot execute action 'read' on 'my-subject'/
          )
        }
      })

      it('should allow action execution', async () => {
        const testScopes =  [
          [{ action: 'read', subject: 'my-subject' }],
          [{ action: 'x-manage', subject: 'my-subject' }],
          [{ action: 'read', subject: 'x-all' }],
          [
            { action: 'x-manage', subject: 'x-all', inverted: true },
            { action: 'read', subject: 'my-subject' }
          ]
        ]

        for (const scopes of testScopes) {
          strategyStub.callsFake(async (request: ServiceRequest) => {
            request.auth = { credentials: {}, scopes }
          })

          const response = await service.dispatch('protected', { params: { foo: 1 } })
          assert.deepStrictEqual(response.user.scopes, scopes)
        }
      })
    })

    describe('scoped action', () => {
      it('should allow/deny action execution', async () => {
        const testScopes =  [
          {
            scopes: [{ action: 'read', subject: 'app' }],
            user: true,
            profile: true,
          },
          {
            scopes: [{ action: 'x-manage', subject: 'app:profile' }],
            user: false,
            profile: true,
          },
          {
            scopes: [{ action: 'read', subject: 'x-all' }],
            user: true,
            profile: true,
          },
          {
            scopes: [{ action: 'x-manage', subject: 'x-all' }],
            user: true,
            profile: true
          },
          {
            scopes: [
              { action: 'x-manage', subject: 'x-all', inverted: true },
              { action: 'read', subject: 'app' },
            ],
            user: true,
            profile: true,
          },
          {
            scopes: [
              { action: 'x-manage', subject: 'x-all', inverted: true },
              { action: 'read', subject: 'app:profile' },
            ],
            user: false,
            profile: true,
          },
          {
            scopes: [
              { action: 'x-manage', subject: 'app:profile', inverted: true },
              { action: 'read', subject: 'app:profile' }
            ],
            user: false,
            profile: true,
          },
          {
            // Deny `*` action on `app`
            // Allow `access` on `app:profile`
            scopes: [
              { action: 'x-manage', subject: 'app', inverted: true },
              { action: 'x-access', subject: 'app:profile' }
            ],
            user: false,
            profile: true,
          },
          {
            // Allow `*` action on `*` subject
            // Deny `read` action on `app` subject
            // Allow `read` action on `app:profile`
            scopes: [
              { action: 'x-manage', subject: 'x-all' },
              { action: 'read', subject: 'app', inverted: true },
              { action: 'read', subject: 'app:profile' }
            ],
            user: false,
            profile: true,
          }, {
            scopes: [{ action: 'x-access', subject: 'app:x-all', inverted: true }],
            user: false,
            profile: false,
          },{
            scopes: [{ action: 'read', subject: 'app', inverted: true }],
            user: false,
            profile: false
          }, {
            scopes: [{ action: 'read', subject: 'app:profile', inverted: true }],
            user: false,
            profile: false,
          }, {
            scopes: [
              { action: 'x-manage', subject: 'x-all' },
              { action: 'read', subject: 'app', inverted: true },
            ],
            user: false,
            profile: false,
          }, {
            scopes: [
              { action: 'x-access', subject: 'app' },
              { action: 'read', subject: 'app:profile', inverted: true },
            ],
            user: true,
            profile: false,
          }
        ]

        const successCheck = async (action: string, scopes: any) => {
          const response = await service.dispatch(`scoped.${action}`, { params: { foo: 1 } })
          assert.deepStrictEqual(response.user.scopes, scopes)
          assert.deepStrictEqual(response.scope, `app:${action}`)
        }

        const failCheck = async (action: string) => {
          await assert.rejects(
            service.dispatch(`scoped.${action}`, { params: { foo: 1 } }),
            new RegExp(`cannot execute action 'read' on 'app:${action}'`)
          )
        }

        for (const {scopes, user, profile} of testScopes) {
          strategyStub.callsFake(async (request: ServiceRequest) => {
            request.auth = { credentials: {}, scopes }
          })

          await (user ? successCheck('user', scopes) : failCheck('user'))
          await (profile ? successCheck('profile', scopes) : failCheck('profile'))
        }
      })
    })
  })
})
