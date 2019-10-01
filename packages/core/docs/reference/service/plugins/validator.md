## Validator Plugin

### Info
| Parameter     | Value       |
|---------------|-------------|
| Name          | `validator` |
| Type          | essential   |
| Priority      | 0           |
| Requirements  |             |

### Config

 Parameter | Type | Required | Default | Description
 --- | --- | --- | --- | ---
 `schemas` | `string[]` | `no` | `[]` | Paths for schemas
`filter` | `Function` | `no` | `null` | Function to filter schemas filenames
`serviceConfigSchemaIds` | `string[]` | `no` | `['microfleet.core', 'config']` | Validate that schemas after initialization of validator
`ajv` | `Object` | `no` | `{ strictKeywords: true }` | Config for `Ajv` library
