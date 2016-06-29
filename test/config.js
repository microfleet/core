// make sure we have stack
require('chai').config.includeStack = true;
const cassandra = require('express-cassandra');

global.SERVICES = {
  redis: {
    hosts: [0, 1, 2].map(idx => ({
      host: `redis-${idx}`,
      port: 6379,
    })),
    options: {},
  },
  amqp: {
    connection: {
      host: 'rabbitmq',
      port: 5672,
    },
  },
  redisSentinel: {
    sentinels: [
      {
        host: 'redis-sentinel',
        port: 26379,
      },
    ],
    name: 'mservice',
    options: {},
  },
  elasticsearch: {
    hosts: [
      {
        host: 'elasticsearch',
      },
    ],
    log: {
      type: 'service',
    },
  },
  cassandra: {
    service: {
      models: {
        Foo: {
          fields: {
            bar: 'text',
          },
          key: ['bar'],
        },
      },
    },
    client: {
      clientOptions: {
        contactPoints: [
          process.env.CASSANDRA_PORT_9042_TCP_ADDR
        ],
        protocolOptions: {
          port: parseInt(process.env.CASSANDRA_PORT_9042_TCP_PORT)
        },
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
    },
  },
  http: {
    server: {
      attachSocketIO: true,
      handler: 'restify',
      handlerConfig: {},
      port: 3000,
    },
  },
  socketio: {
    service: {
      actionsDirectory: `${__dirname}/actions/socketio`,
    },
    server: {
      options: {},
    },
  },
};
