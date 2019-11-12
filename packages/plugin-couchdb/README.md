# Microfleet CouchDB Plugin

Adds CouchDB support to microfleet. Learn more at https://github.com/apache/couchdb-nano and
https://couchdb.apache.org/

## Install

`yarn add @microfleet/plugin-couchdb`

## Configuration

To make use of the plugin adjust microfleet configuration in the following way:

```ts
exports.plugins = [
  ...,
  'couchdb',
  ...
]

exports.couchdb = {
  connection: 'http://username:password@database:5984', // will connect to this instance
  database: 'sample', // all operations will be scoped to this database
  indexDefinitions: [{ // optional section for indexes to be created on startup
    fields: ['_id', 'name'],
    name: 'basic',
    ddoc: '_id_for_index', // this is important so that we dont create the same index over and over again
  }]
}
```

## Interface

`service.couchdb` exposes document functions interface as described in here:
https://github.com/apache/couchdb-nano#document-functions
