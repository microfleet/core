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
`schemasInitPath` | `string` | `yes` | `../../schemas` | Main directory for configs
`filter` | `Function` | `no` | `null` | Function to filter schemas filenames
`schemas` | `string[]` | `no` | `[]` | Additional paths for schemas
`serviceConfigSchemaIds` | `string[]` | `no` | `['microfleet.core', 'config']` | Validate that schemas after initialization of validator
`ajv` | `Object` | `no` | `{ strictKeywords: true }` | Config for `Ajv` library
