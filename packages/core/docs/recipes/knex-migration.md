# Using Knex Migrations
In the [previous recipe](./knex.md) we manually create database table.
Generally, you don't want to manage database structure changes manually, because it's not so effective.

In this recipe, you will learn how to configure your `Microfleet` service to manage your database structure using migrations.

## Prerequisites:
* Microfleet service with configured `knex` plugin. For more information please refer [this recipe](./knex.md)
* Installed `PostgreSQL` server. 
* PostgreSQL Table structure and Datatypes knowledge.

## Service configuration

First of all, we need to enable migrations in our microservice. The `Knex` plugin provides migration handling features by default, but they are disabled globally.

Let's enable them by adding the following lines into your main microservice class:

```javascript
class DemoApp extends Microfleet {
  constructor(opts = {}) {
    super(merge({}, config, opts))
    // ...
    this.addConnector(ConnectorsTypes.migration, () => (
      this.migrate('knex', {
        directory: `${__dirname}/migrations/knex
      })
    ), 'knex-migration')
    // ...
  }
}
```

By adding these lines of code, we explicitly enable database migration for the PostgreSQL and instruct the `Knex` plugin to look for migrations from `./migrations/knex` directory.

As a second argument of `this.migrate()` function you can pass configuration parameters described in [`Knex Migration` manual](http://knexjs.org/#Migrations).
Another option is to define migration configuration in your `configs/knex.js`:

```javascript
// configs/knex.js
module.exports = {
  knex: {
    client: 'pg',
    connection: {
      // connection settings
    },
    migrations: {
      directory: './path/to/migrations/directory',
    },
  },
}
```

## Create table migration
For advanced information about Migrations, please read [`Knex Migration` manual](http://knexjs.org/#Migrations).

After we successfully configured database migration, we can start creating some migrations:

Let's create a migration that creates our first table:
```javascript
// migrations/knex/01_todo.js

exports.up = function todoTableCreate(knex) {
  return knex.schema
    .createTable('todos', (table) => {
      table.increments('id')
      table.string('name', 255).notNullable()
      table.string('description', 255).notNullable()
      table.boolean('state').defaultTo(false)
      table.timestamp('created').defaultTo(knex.fn.now())
    })
}

exports.down = function todoTableDelete(knex) {
  return knex.schema
    .dropTable('todos')
}

exports.config = { transaction: false }
```

Now, if you start your microservice, you will see that the new table has been generated automatically.
```console
user@$: DEBUG=* yarn mfleet
  knex:bindings undefined trx2 +5ms
  knex:query update "knex_migrations_lock" set "is_locked" = ? where "is_locked" = ? trx2 +3ms
  knex:bindings [ 1, 0 ] trx2 +3ms
  knex:query COMMIT; trx2 +1ms
  knex:bindings undefined trx2 +1ms
  knex:tx trx2: releasing connection +7ms
  knex:client releasing connection to pool: __knexUid1 +7ms
  knex:client acquired connection from pool: __knexUid1 +1ms
  knex:query select max("batch") as "max_batch" from "knex_migrations" trx2 +3ms
  knex:bindings [] trx2 +3ms
  knex:client releasing connection to pool: __knexUid1 +1ms
  knex:client acquired connection from pool: __knexUid1 +1ms
  knex:query create table "todos" ("id" serial primary key, "name" varchar(255) not null, "description" varchar(255) not null, "state" boolean default '0', "created" timestamptz default CURRENT_TIMESTAMP) trx2 +3ms
  knex:bindings [] trx2 +3ms
  knex:client releasing connection to pool: __knexUid1 +10ms
  knex:client acquired connection from pool: __knexUid1 +1ms
  knex:query insert into "knex_migrations" ("batch", "migration_time", "name") values (?, ?, ?) trx2 +10ms
  knex:bindings [ 1, 2020-01-16T14:43:57.090Z, '01-todo.js' ] trx2 +11ms
  knex:client releasing connection to pool: __knexUid1 +4ms
  knex:client acquired connection from pool: __knexUid1 +0ms
  knex:query update "knex_migrations_lock" set "is_locked" = ? trx2 +4ms
  knex:bindings [ 0 ] trx2 +4ms
  knex:client releasing connection to pool: __knexUid1 +3ms
```

## CRUD Table fields

If you need to add or delete some fields or create new indices, you can create second migration:

```javascript
// migrations/knex/02-todo-restructure.js
exports.up = function todoTableAlter(knex) {
  return knex.schema
    .alterTable('todos', (table) => {
      table.string('description', 255).alter()
      table.boolean('state').defaultTo(true).alter()
      table.string('extradata', 255)
    })
}

exports.down = function todoTableDelete(knex) {
  return knex.schema
    .alterTable('todos', (table) => {
      table.string('description', 255).notNullable().alter()
      table.boolean('state').defaultTo(false).alter()
      table.dropColumn('extradata')
    })
}

exports.config = { transaction: false }
```

Now, you can start your service with the DEBUG variable, and you will see that our table structure was updated successfully. 

```console
user@$: DEBUG=* yarn mfleet
....
  knex:client acquired connection from pool: __knexUid1 +4ms
  knex:query BEGIN; trx2 +5ms
  knex:bindings undefined trx2 +5ms
  knex:query update "knex_migrations_lock" set "is_locked" = ? where "is_locked" = ? trx2 +3ms
  knex:bindings [ 1, 0 ] trx2 +3ms
  knex:query COMMIT; trx2 +2ms
  knex:bindings undefined trx2 +2ms
  knex:tx trx2: releasing connection +8ms
  knex:client releasing connection to pool: __knexUid1 +7ms
  knex:client acquired connection from pool: __knexUid1 +0ms
  knex:query select max("batch") as "max_batch" from "knex_migrations" trx2 +3ms
  knex:bindings [] trx2 +3ms
  knex:client releasing connection to pool: __knexUid1 +2ms
  knex:client acquired connection from pool: __knexUid1 +0ms
  knex:query alter table "todos" add column "extradata" varchar(255) trx2 +3ms
  knex:bindings [] trx2 +3ms
  knex:query alter table "todos" alter column "description" drop default trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "description" drop not null trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "description" type varchar(255) using ("description"::varchar(255)) trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "state" drop default trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "state" drop not null trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "state" type boolean using ("state"::boolean) trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:query alter table "todos" alter column "state" set default '1' trx2 +2ms
  knex:bindings [] trx2 +2ms
  knex:client releasing connection to pool: __knexUid1 +18ms
  knex:client acquired connection from pool: __knexUid1 +1ms
  knex:query insert into "knex_migrations" ("batch", "migration_time", "name") values (?, ?, ?) trx2 +3ms
  knex:bindings [ 2, 2020-01-16T15:04:30.572Z, '02-todo-restructure.js' ] trx2 +3ms
  knex:client releasing connection to pool: __knexUid1 +3ms
....

```

## Migration execution order
All migrations applied in alphabetical order. So you should name your migrations with some numeric prefix like '01, 02' or DateTime like '20200101_000000, 20200102_000000'

## Notice: Migration rollback or down
Assuming that you decided to use OEM `knex` [CLI tool](http://knexjs.org/#Migrations-CLI) in your project to downgrade or rollback some migrations. In this case, you must disable `Microfleet` automatic migration in all services that use the same database. If this feature remains enabled and there will be some `Microfleet` services running (that could fail and restart on database structure change), they will try to apply migrations that you tried to revert.
