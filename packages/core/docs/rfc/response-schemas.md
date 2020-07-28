# Action response schemas

## Overview and motivation

This document describes an additional feature that will allow us to validate any action response and will help to provide good schema-based documentation.
In the future, this feature will allow us to use `fast-JSON-stringify` for faster response serialization.

## Response validation

To achieve the described feature:

1. Add new `plugin/router`s `lifecycle` `responseValidate` cycle before `response`.
2. Any action that should validate its response should provide `responseSchema` in its properties.
3. Add `router.routes` `responseValidation` parameter, that configures global response validation. If the `panic` option enabled, the validator will throw an error otherwise, the new warning logged.
   ```javascript
   const responseValidation = {
     enabled: false,
     percent: 7,
     panic: true
   }
   ```
4. Add `validateResponse` for actions with response validation, that allows disabling response validation for action. NOTE: If validation is disabled globally, this option is ignored.
5. Add new `ActionRuntimeMeta` class. This class allows to store global information for action inside `router` namesace. In our case instance of the class stores action validation counters and flags.

## ApiDoc Generation
There are 2 options to generate API documentation using JSON schemas.
1. Adobe [`jsonschema2md`](https://github.com/adobe/jsonschema2md/) - BUT it generates too many extra files and it's hard to integrate them to the existing docs.
2. `apidoc` && `apidoc-plugin-schema` is a better alternative and will allow us to create custom templates for documentation. JSON Schemas documentation will use references in API doc comments.

## Example:
Schema `schemas/response/generic/health.json`:
```json
{
  "title": "Health check response",
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "alive": {
          "description": "List of working plugins"
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "failed": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": true
          }
        },
        "status": {
          "type": "string"
        }
      }
    }
  }
}
```

Action:

```javascript
/**
 * @apiSchema {jsonschema=schema/response/generic/health.json} apiSuccess 
 */
async function genericHealthCheck(this: Microfleet, request: ServiceRequest): Promise<{ data: HealthStatus }> {
  const data = await this.getHealthStatus()
  // ....
  return { data }
}

// to avoid 'setTransportAsDefault: false' and make things obvious
genericHealthCheck.transports = [
  ActionTransport.http,
  ActionTransport.amqp,
  ActionTransport.internal,
  ActionTransport.socketIO,
]

// inspect response validation middleware to check successful response
genericHealthCheck.responseSchema = 'response.generic.health'
// optional, allows to skip validation for this action
genericHealthCheck.validateResponse = false
export default genericHealthCheck
```

Service Config:
```javascript
const service = new Microfleet({
  //...
  router: {
    //...
    routes: {
      validateResponse: true
    }
    //...
  }
  //...
})
```

