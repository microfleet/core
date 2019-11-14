# Validator Plugin
This plugin helps to validate any JavaScript Objects using `@microfleet/validation` inside your service.

## Dependencies
NPM Packages:
* [`@microfleet/validation`](https://github.com/microfleet/validation)
* `ajv`
* `common-errors`

## Methods

| Method | Description |
|--------|-------------|
| `attach(service: Microfleet, config, parentFile)` | Register plugin for Microfleet `service` with provided [`config`](#configuration) and use `parentFile` directory as pointer to the application root directory.|

## Exported Methods and Properties
These methods available after Plugin initialization under `service` namespace:

| Method | Description | 
|--------|-------------|
| `validator` | Instance methods of the `@microfleet/validation` validator. |
| `validator.addLocation(string)` | Allows to add additional `schema` location with your custom schemas`. |
| `validate(schemaName, object)` | Reference to `validator.validate` method. |
| `validateSync(schemaName, object)` | Reference to `validator.validateSync` method. |
| `ifError(schemaName, object)` | Reference to `validator.ifError` method. |

** `schemaName` value can be:
* `"$id"` property defined in `schema.json`.
* Validator Generated: `schemas/foo/bar.json` -> `foo.bar`.

## Configuration

 Parameter | Type | Required | Default | Description
 --- | --- | --- | --- | ---
 `schemas` | `string[]` | `no` | `[]` | Paths for schemas
`filter` | `Function` | `no` | `null` | Function to filter schemas filenames
`serviceConfigSchemaIds` | `string[]` | `no` | `['microfleet.core', 'config']` | Validate that schemas after initialization of validator
`ajv` | `Object` | `no` | `{ strictKeywords: true }` | Config for [`Ajv`](https://ajv.js.org/#options) library

