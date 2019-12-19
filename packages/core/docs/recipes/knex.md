# Use of the Knex Plugin

Almost every microservice should use some relational or object databases to its data. In this recipe, we will try to use `Knex Plugin` to provide simple CRUD operations on data stored inside the `PostgreSQL` database.

This plugin supports Migrations, but we will discuss their appliance in the next recipes.



## Prerequisites

* Please read [Knex](http://knexjs.org/) documentation in case you didn't hear anything about Knex.
* Installed `PostgreSQL` server. Please see [this page](https://www.rabbitmq.com/download.html) . Further, you can use other AMQP Servers.
* Some basic SQL and PostgreSQL operation knowledge.

If you don't want to install the PostgreSQL server into your system, you may use Docker:

```console
$@: docker run --rm --name my-postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgres
```

## Service configuration

First of all, we will need to enable `Knex Plugin` in our service.

Please read [Knex Plugin](../reference/plugins/knex.md) for additional configuration options and information.

### 1. Enable plugin

Add plugin name to the list of enabled plugins. Enable the required dependencies as well:

```js
// configs/plugins.js
exports.plugins = [
  'validator',
  'logger',
  'knex',
  'http', // we will expose HTTP endpoint to test our service
]
```

### 2. Configure connection to PostgreSQL server

Let's start with the connection configuration:

```js
// configs/knex.js
exports.knex = {
  debug: false,
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'mysecretpassword',
    database: 'postgres',
  },
};
```

Now you can start your service and check that the connection to the PostgreSQL server was successful:

```console
$user@: yarn start
yarn run v1.21.1
$ mfleet
[2019-12-19 13:12:24.353 +0000] INFO  (demo-app/26114 on localhost): ready
    pluginName: "knex"
    connectorType: "database"
[2019-12-19 13:12:24.376 +0000] INFO  (demo-app/26114 on localhost): ready
    pluginName: "knex"
    connectorType: "database"
[2019-12-19 13:12:24.376 +0000] INFO  (demo-app/26114 on localhost): ready
    pluginName: "knex-migration"
    connectorType: "migration"
[2019-12-19 13:12:24.453 +0000] INFO  (demo-app/26114 on localhost): ready
    pluginName: "knex-migration"
    connectorType: "migration"

```

## CRUD Application

When the plugin is successfully enabled, we can start developing our service.
First of all, we need to create a table that will store our TODO records.
The TODO structure and validation was described in [Validation recipe](./validation.md#object-validation).

Let's create a table for it, you have to execute these commands in `psql` console:

```sql
CREATE SEQUENCE public.todos_id_seq;

CREATE TABLE public.todos (
    id integer NOT NULL DEFAULT nextval('todos_id_seq'),
    name character varying(255) NOT NULL,
    description character varying(255) NOT NULL,
    state boolean DEFAULT false,
    created timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER SEQUENCE public.todos_id_seq OWNED BY public.todos.id;
```

### Actions

After you created the database table, you can start using it in your service.
Here are the sample actions, that perform some validation and CRUD operations on our todo:

#### Add

```javascript
//src/actions/knex/add-todo.js
const { ActionTransport } = require('@microfleet/core')

async function addTodo(request) {
  const { todo } = request.params
  const { knex } = this
  const [newTodoId] = await knex.insert(todo, 'id').into('todos')
  return { todoId: newTodoId }
}

addTodo.transports = [ActionTransport.http]
addTodo.schema = 'validation.schema'
module.exports = addTodo
```

#### Update

```javascript
//src/actions/knex/update-todo.js
const { ActionTransport } = require('@microfleet/core')

async function updateTodo(request) {
  const { todo } = request.params
  const { knex } = this
  await knex('todos').update(todo)
  const updatedTodo = await knex('todos').select().where({ id: todo.id }).first()
  return { todo: updatedTodo }
}

updateTodo.transports = [ActionTransport.http]
updateTodo.schema = 'validation.schema'
module.exports = updateTodo
```

#### Get

```javascript
//src/actions/knex/get-todo.js
const { ActionTransport } = require('@microfleet/core')
const Errors = require('common-errors')

async function getTodo(request) {
  const { knex } = this
  const { id } = request.params
  const todo = await knex.select('*').from('todos').where('id', id).first()
  if (todo === undefined) {
    throw new Errors.NotFoundError('No such todo!')
  }
  return { todo }
}

getTodo.transports = [ActionTransport.http]
module.exports = getTodo
```

#### List

```javascript
//src/actions/knex/list-todo.js
const { ActionTransport } = require('@microfleet/core')

async function listTodo() {
  const { knex } = this
  const todos = await knex.select().from('todos')
  return { todos }
}

listTodo.transports = [ActionTransport.http]
module.exports = listTodo
```

#### Delete

```javascript
//src/actions/knex/delete-todo.js
const { ActionTransport } = require('@microfleet/core')

async function deleteTodo(request) {
  const { id } = request.params
  const { knex } = this
  const deleted = await knex('todos').where('id', id).delete()
  return { deleted }
}

deleteTodo.transports = [ActionTransport.http]
module.exports = deleteTodo

```

### Test run

Now you can start your service and try to query it:

```console
$user@: curl http://0.0.0.0:3000/knex/add-todo -H "Content-Type: application/json" -X POST --data '{"todo":{"name" : "foo", "description": "dddddd", "state": 0}}' | jq
{
  "todoId": 1
}

$user@: curl http://localhost:3000/knex/list-todo | jq
{
  "todos": [
    {
      "id": 1,
      "name": "foo",
      "description": "dddddd",
      "state": false,
      "created": "2019-12-19T14:24:50.016Z"
    }
  ]
}

```

And check that record was successfully added into the database:

``` console
$user@: docker exec -it my-postgres psql --username=postgres --password
Password:
psql (12.1 (Debian 12.1-1.pgdg100+1))
Type "help" for help.

postgres=# select * from todos;
 id | name | description | state |            created
----+------+-------------+-------+-------------------------------
  1 | foo  | dddddd      | f     | 2019-12-19 14:24:50.016534+00
(1 row)

postgres=#
```

That's it, please don't forget about writing tests for your code!
