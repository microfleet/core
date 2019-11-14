# Use of Validator plugin
Please read [this document](../reference/service/plugins/validator.md) For additional configuration and API reference.

## Recipes:
* [Service configuration](#service-configuration)
* [Request validation](#request-validation)
* [Query string validation](#query-string-validation)
* [Object validation](#object-validation)

## Service configuration
### 1. Enable plugin
Enable plugin by adding it into `config.plugins`:
```js
// src/configs/plugins.js
exports.plugins = [
  'validator',
];
```

### 2. Plugin configuration
Define plugin configuration inside your configuration folder:
```js
// src/configs/validator.js
exports.validator = {
  schemas: ['../schemas'],
}

```
All schemas from `${ProjectRoot}/schemas` are loaded into validator and available by file name or `$id` defined inside. 

### 3. Define JSON Schemas
All schemas are defined using [JSON Schema Standart](https://json-schema.org/specification.html) and all validation keywords before `draft-07`.

#### `TODO` Object
`TODO` object schema definition. This object describes your future `TODO` record.
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

#### Action schemas
Schemas defined in this section used in further validation.
##### Create TODO

```json
// schemas/todo.create.json
{
  "type": "object",
  "required": [
    "todo"
  ],
  "properties": {
    "todo": {
      "$ref": "objects.todo"
    }
  }
}
```
##### List TODO
```json
// schemas/todo.list.json
{
  "type": "object",
  "required": [
    "page",
    "hidden"
  ],
  "properties": {
    "page": {
      "type": "integer",
      "minimum": 1
    },
    "hidden": {
      "type": "boolean"
    }
  }
}

```

## Usage
After defining all schemas and enabling the `Validator` plugin, you can use it in your actions, models, etc.

If you unsure in Schema name you can run service in debug mode and find it in logs:

```bash
$user: DEBUG=ms-validation* yarn start
  ms-validation adding schema [objects.todo], /create-microfleet-app/schemas/objects/todo.json with id choice of $id: [objects.todo] vs defaultName: [objects.todo] +1ms
  ms-validation adding schema [todo.create], /create-microfleet-app/schemas/todo.create.json with id choice of $id: [todo.create] vs defaultName: [todo.create] +0ms
  ms-validation adding schema [todo.list], /create-microfleet-app/schemas/todo.list.json with id choice of $id: [todo.list] vs defaultName: [todo.list] +0ms

```


### Request validation
Our service will respond to POST `http://localhost/todo/create` URL and validate Request using  [`todo.create`](#create-todo) schema. The easiest way is to define your actions `schema` property, and `Microfleet` will do the rest of the work.

Let's create a new `src/actions/todo/create.js` file with contents:
```js
const { ActionTransport } = require('@microfleet/core');

function createTodo(request) {
  const { todo } = request.params;
  // Create our new TODO....
  return { ok: { todo }};
}

createTodo.transports = [ActionTransport.http];
// Schema used for request validation
createTodo.schema = 'todo.create';
module.exports = createTodo;

```

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

## Object validation
The `Validator` plugin exports its methods into `Service` instance. You can access validation methods by calling `validate`, `validateSync` etc. Available methods and properties described in [API Reference](../reference/service/plugins/validator.md).

Let's create action that validates passed `TODO` Object and returns result:

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

Now you may start your microservice and check that validation is working:

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
