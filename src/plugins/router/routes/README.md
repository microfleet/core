# Routes

## `Action`

### Usage

`Action` is an `object` that contains the following properties

* `allowed` - `null` or a `function` that returns `Promise`
* `auth` - `null` or `string` with auth `strategy` name
* `handler` - `required`, `function` that returns `Promise`
* `schema` - `null` or `string` with validation schema name
* `transports` - an array of allowed `transports`

### Example

```js
module.exports = {
  auth: 'token',
  allowed: (request, action, router) => Promise.reject('access denied'),
  hanlder: (request, action, router) => Promise.resolve('success'),
  schema: 'action.join',
  transports: ['http', 'socketIO']
}
```
