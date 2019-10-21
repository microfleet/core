# Microfleet Knex Plugin

Adds Knex support to microfleet. This can be used to interact with \*SQL
databases

## Install

`yarn add @microfleet/plugin-knex`

## Configuration

To make use of the plugin adjust microfleet configuration in the following way:

```ts
interface Config {
  debug?: boolean;
  client?: string | typeof Client;
  dialect?: string;
  version?: string;
  connection?:
    | string
    | ConnectionConfig
    | MariaSqlConnectionConfig
    | MySqlConnectionConfig
    | MsSqlConnectionConfig
    | OracleDbConnectionConfig
    | Sqlite3ConnectionConfig
    | SocketConnectionConfig;
  pool?: PoolConfig;
  migrations?: MigratorConfig;
  postProcessResponse?: (result: any, queryContext: any) => any;
  wrapIdentifier?: (
    value: string,
    origImpl: (value: string) => string,
    queryContext: any
  ) => string;
  seeds?: SeedsConfig;
  acquireConnectionTimeout?: number;
  useNullAsDefault?: boolean;
  searchPath?: string | string[];
  asyncStackTraces?: boolean;
  log?: Logger;
}

// make sure to add this to the list of loadable plugins
exports.plugins = [
  ...,
  'knex',
  ...
]

// knex configuration
exports.knex: Config = { ... }
```

## Interface

Microfleet Knex Plugin extends service interface with the following methods:

### service.knex: Knex

Initialized instance. Look at the docs here - http://knexjs.org/
