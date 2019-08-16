# Publish options
| Option | Type | Default Value | Description |
|--------|------|---------------|-------------|
| `confirm` | `boolean` | `false` | Whether to wait for commit confirmation before resolving |
| `immediate` | `boolean` |  `false` | Waits for the message to be delivered and resolves if it can, rejects otherwise, not implemented by RammitMQ |
| `mandatory` | `boolean` | `false` | When true and message cant be routed to a queue – exception returned, otherwise its dropped |
| `contentType` | `string` | `application/json` | Default content-type for messages |
| `contentEncoding` | `string`| `plain` | Default content-encoding |
| `headers` | `object` | `undefined` @todo check | Headers set |
| `simpleResponse` | `boolean` | `true` | Whether to return only response data or include headers etc. |
| `deliveryMode` | `number` | `1` | `1` – transient, `2` – saved on disk | 
