# Knex plugin migrations

`@microfleet/plugin-knex` database migrations are using the `knex` migrations.
Migration interface of the `@microfleet/plugin-knex` plugin, should be registered as `Connector` with type `ConnectorType.migration` inside `@microfleet/core` service.

## Dependencies

NPM Packages:

* `@microfleet/plugin-knex`

## Methods

| Method                             | Description         |
| ---------------------------------- | --------------------|
| `service.migrate('knex', [config]: Object)` | Applies migrations |

The `config` parameter of the `migrate` method accepts `Object` with migration configuration.
Please read [Migration API](http://knexjs.org/#Migrations-API) for the list of the available options.
