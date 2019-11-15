# Validator plugin
Please read [this document](../reference/service/plugins/validator.md) for additional configuration and API reference.

In this recipe, we will set up the `Validator` plugin and try to perform validation of simple `todo` object using the Request validation and generic validation API calls.

* [Service configuration](#service-configuration)
* [Object validation](#object-validation)
* [Request validation](#request-validation)


## Service configuration
First of all, you need to enable and configure the `Validator` plugin.

Enable the plugin by adding it into `config.plugins`:
```js
// src/configs/plugins.js
exports.plugins = [
  'validator',
];
```

Define plugin configuration inside your configuration folder:
```js
// src/configs/validator.js
exports.validator = {
  schemas: ['../schemas'],
}

```
All schemas from `${ProjectRoot}/schemas` are loaded into the validator and available by file name or `$id` defined inside. 

## Object validation
The `Validator` plugin exports its methods into the `Service` instance. You can access validation methods by calling `validate`, `validateSync` etc. Available methods and properties are described in the [API Reference](../reference/service/plugins/validator.md).
All schemas defined using [JSON Schema Standart](https://json-schema.org/specification.html) and all validation keywords before `draft-07`.

As it was mentioned before, our service will consume and validate `todo` object, so we have to define its validation schema:
```json
// schemas/objects/todo.json
{
  "type": "object",
  "required": [
    "name",
    "description",
    "state"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 3,
      "maxLength": 150
    },
    "description": {
      "type": "string",
      "default": ""
    }
  }
}

```

Now you can start your service and check that schema accepted by the `Validator` plugin.
If you unsure in Schema name you can run service in debug mode and find it in logs:

```bash
$user: DEBUG=ms-validation* yarn start
  ms-validation adding schema [objects.todo], /create-microfleet-app/schemas/objects/todo.json with id choice of $id: [objects.todo] vs defaultName: [objects.todo] +1ms
```

After this you can create action that validates passed `todo` Object and returns the result:

```js
// src/actions/todo/validate.js
const { ActionTransport } = require('@microfleet/core');

function validateTodo(request) {
  const { todo } = request.params;
  const validationResult = this
    .validate('objects.todo', todo)
    .then((result) => {
      return { validationResult: result }
    })
    .catch({ name: 'HttpStatusError' }, (e) => {
      return { validationError: e };
    });
  return validationResult;
}

validateTodo.transports = [ActionTransport.http];
module.exports = validateTodo;
```

Start your service and check that validation is working:

```console
$@> curl http://0.0.0.0:3000/todo/validate -H "Content-Type: application/json" -X POST --data '{"todo":{"name" : "foo"}}' | jq
```
And the response is going to be like:
```json
{
  "validationError": {
    "status": 400,
    "statusCode": 400,
    "status_code": 400,
    "name": "HttpStatusError",
    "message": "objects.todo validation failed: data should have required property 'state'",
    "errors": [
      {
        "status": 400,
        "statusCode": 400,
        "status_code": 400,
        "name": "HttpStatusError",
        "message": "should have required property 'state'",
        "field": ""
      }
    ]
  }
}

```

### Request validation
The `Validator` plugin can perform automatic validation of the request object using its `preRequest` hook.

Let's create an action that responds to POST `http://localhost/todo/create` URL and validates Request Body using `todo.create` schema.

First, you need to define a schema describing Request Body that is accepted by your action:
```json
// schemas/todo.create.json
{
  "type": "object",
  "required": [
    "todo"
  ],
  "properties": {
    "todo": {
      // Note: we defined our object in previous step. You can reference other schemas using $ref tag.
      "$ref": "objects.todo"
    }
  }
}
```

And create new action:
```js
// src/actions/todo/create.js
const { ActionTransport } = require('@microfleet/core');

function createTodo(request) {
  const { todo } = request.params;
  // Create our new `todo`....
  return { ok: { todo }};
}

createTodo.transports = [ActionTransport.http];

// Schema used for request validation
createTodo.schema = 'todo.create';

module.exports = createTodo;
```

As you can see, action has a new  `schema` property defined. This property instructs the `Validator` plugin that this action needs to be validated. 

Now you may start your microservice and check that validation is working:

```console
$@> curl http://0.0.0.0:3000/todo/create -H "Content-Type: application/json" -X POST --data '{"todo":{"name" : "foo"}}' | jq
```
And the response is going to be like:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "todo.create validation failed: data.todo should have required property 'state'",
  "name": "HttpStatusError"
}
```
