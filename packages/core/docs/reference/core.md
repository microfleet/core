# Core config

| Name   | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | `true` | Service name |
| `maintenanceMode` | `bool` | `false` | Maintenance mode on/off |

## Name
Service name setting is used to uniquely identify the service.

## Maintenance mode
Toggles service maintenance mode. Read more on the [maintenance mode recipe](../recipes/maintenance.md)

## Configuration example

Set up it like this:
```js
const config = {
  name: 'my-service-name',
}
```
