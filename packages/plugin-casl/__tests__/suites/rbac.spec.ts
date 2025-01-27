import { resolve } from 'node:path'
import sinon from 'sinon'
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

test('#Casl RBAC plugin', async (t) => {
  let service: Microfleet
  const strategyStub = sinon.stub()

  t.before(async () => {
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
      casl: {
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

  t.after(async () => {
    await service?.close()
  })

  await t.test('#direct usage', async (t) => {
    await t.test('panics on unknown ability', async () => {
      await assert.rejects(
        async () => {
          service.rbac.get('unknown-ability')
        },
        { message: "'unknown-ability' ability does not exists in configuration" }
      )
    })

    await t.test('uses subjectDetector', async () => {
      const { rbac } = service
      const ability = rbac.get('foo-ability')

      assert.equal(rbac.can(ability, 'manage', { type: 'foo' }), true)
      assert.equal(rbac.can(ability, 'manage', { type: 'bar' }), false)
    })

    await t.test('allows to override subject', async () => {
      const { rbac } = service
      const ability = rbac.get('foo-ability')

      assert.equal(rbac.canSubject(ability, 'manage', 'foo', {}), true)
      assert.equal(rbac.canSubject(ability, 'manage', 'bar', {}), false)
    })
  })

  await t.test('#action config', async (t) => {
    await t.test('flat action', async (t) => {
      await t.test('should not allow action execution', async () => {
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

      await t.test('should allow action execution', async () => {
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

    await t.test('scoped action', async (t) => {
      await t.test('should allow/deny action execution', async () => {
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
