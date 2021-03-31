import cassandra = require('express-cassandra')

export const config = {
  cassandra: {
    service: {
      models: {
        Foo: {
          fields: { bar: 'text' },
          key: ['bar'],
        },
      } as Record<any, any> | string,
    },
    client: {
      clientOptions: {
        contactPoints: ['cassandra'],
        protocolOptions: { port: 9042 },
        keyspace: 'mykeyspace',
        queryOptions: {
          consistency: cassandra.consistencies.one,
        },
      },
      ormOptions: {
        defaultReplicationStrategy: {
          class: 'SimpleStrategy',
          replication_factor: 1,
        },
        dropTableOnSchemaChange: false,
        createKeyspace: true,
      },
    }
  }
}
