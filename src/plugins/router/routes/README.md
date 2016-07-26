# Routes

## `Action`

### Usage

`Action` is a `function` that takes `request` as parameter.
The following properties could be assigned to `Action`

* `Action.allowed` - a `function` that returns `Promise`, take `request`
  as parameter
* `Action.auth` - a `string` with auth `strategy` name
* `Action.schema` - a `string` with validation schema name
* `Action.transports` - an array of allowed `transports`
* `Action.setTransportsAsDefault` - if `true` and `Action.transports` 
   is empty set action transports from `config.transports`
### Example

```js
const { ActionTransport } = require('mservice');

function Action(request) {
  return Promise.resolve(request.params);
}

Action.auth = 'token';
Action.allowed = (request, action, router) => Promise.reject('access denied');
Action.schema = 'action.join';
Action.transports = [ActionTransport.http, ActionTransport.socketIO];
```
