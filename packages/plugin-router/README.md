# @microfleet/plugin-router

Router for `Microfleet`. Adds ability to call specific functions - `ServiceAction` - using different transports (`amqp`, `http`, `socketio`).

## Usage

```json
// schemas/add-cat.json
{
  "$id": "create-cat",
  "type": "object",
  "required": ["name"],
  "additionalProperties": false,
  "properties": {
    "name": {
      "type": "string"
    },
    "color": {
      "type": "string",
      "default": "gray"
    }
  }
}
```

```js
// src/actions/create-cat.ts
import { Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

const cats = []

export default async function createCatAction(this: Microfleet, request: ServiceRequest): Promise<string> {
  const { color, name } = request.params
  const cat = { color, name }

  cats.push(cat)

  return `${name} was created!`
}
```

```js
// src/index.js
const service = new Microfleet({
  name: 'cats api',
  plugins: [
    'validator',
    'logger',
    'hapi',
    'router',
    'router-hapi',
  ],
})

await service.connect()
```

```sh
$ curl -XPOST "http://0.0.0.0:3000/create-cats" -d '{"name":"perchik","color":"pepper"}' -H "Content-Type: application/json"
Perchik was created!
```

## ServiceAction

Handler for transport request.

### Signature

```js
(this: Microfleet, request: ServiceRequest) => Promise<any>
```

### Additional properties

@todo

## ServiceRequest

Object with the following structure.

```js

```

## Lifecycle

## Extensions
