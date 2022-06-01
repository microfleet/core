# Microfleet plugin CASL

Adds RBAC/PBAC feature using [CASL](https://casl.js.org/v5/en/).

## Install

```shell
> pnpm add @microfleet/plugin-casl
```

## Configuration

To make use of the plugin, adjust Microfleet configuration in the following way:

```js
// config/app.js

exports.plugins = [
  // ...
  'casl'
]

// See ./src/rbac.ts
exports.rbac = {
  abilities: {
    'admin-ability': [
      {
        subject: 'all',
        action: 'manage',
      }
    ],
    'user-ability': [
      {
        subject: 'user:profile',
        action: 'manage'
      }
    ]
  },
  detectSubjectType: (obj) => obj.type
}
```

## Usage

The `plugin-casl` extends the `Microfleet` base type with `RBAC` property which provides access to the `Rbac` class instance. This class includes extended support for scoped subjects like `['user:profile', 'admin:users']` and defines abilities with top-level scopes:

```ts
const scopes = [
  // deny access to `admin:*` subject
  {
    subject: 'admin',
    action: 'manage',
    inverted: true
  },
  // allow read access to `admin:users` subject
  {
    subject: 'admin:users',
    action: 'read',
  }
]
```

### Service action

Plugin extends `ServiceAction` interface with `rbac` property with the `ActionRbac` type. This property allows specifying action level policy checks.

The `plugin-casl` adds its handler on the `Router.preAllowed` hook and relies on the extended `req.auth` property with the `AuthInfo` type. This property should provide one of the `auth` strategies.

#### Example

```ts
const serviceConfig = {
  router: {
    auth: {
      strategies: {
        token: async (request: ServiceRequest) => {
          request.auth = {
            credentials: {},
            scopes: [
              { subject: 'account', action: 'manage' }
            ]
          }
        },
      },
    },
  },
}
```

```ts
import { ServiceRequest, ServiceAction, ActionTransport } from '@microfleet/plugin-router'

const actionWithRbac: Partial<ServiceAction> = async (request: ServiceRequest) => {
  return {}
}

// ...

actionWithRbac.auth = 'token'
actionWithRbac.rbac = {
  action: 'read',
  subject: 'user-profile'
}

export default actionWithRbac
```

### Direct usage

It is possible to create custom policy checks using the `Microfleet.rbac` property:

#### Predefined abilities
```ts
// service.rbac.abilities should be filled with predefined abilities: `admin`, `user`
const protected = (this: Microfleet, userGroup: string) => {
  const ability = this.rbac.getAbility(userGroup);
  if (ability.can('do-smth', 'user')) {
    // perform action
  }

  throw new AccessDenied('')
}

```

#### Dynamic abilities

```ts
const userScopes = [
  {
    action: 'read',
    subject: 'user'
  }
]

const protected = (this: Microfleet) => {
  const ability = this.rbac.createAbility(userScopes);

  const canReadUserProfile = this.rbac.can(ability, 'read', 'user:profile') // true
  const canWriteUserProfile = this.rbac.can(ability, 'write', 'user:profile') // false
  const canReadUserScope = this.rbac.can(ability, 'read', 'user')

}
```


