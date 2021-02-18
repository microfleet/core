// make sure we have stack
require('chai').config.includeStack = true;
const cassandra = require('express-cassandra');
const path = require('path');
const { ActionTransport } = require('..');

global.SERVICES = {
  redis: {
    hosts: [0, 1, 2].map((idx) => ({
      host: 'redis-cluster',
      port: 7000 + idx,
    })),
    options: {},
  },
  amqp: {
    transport: {
      connection: {
        host: 'rabbitmq',
        port: 5672,
      },
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
    node: 'http://elasticsearch:9200',
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
          'cassandra',
        ],
        protocolOptions: {
          port: 9042,
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
  router: {
    routes: {
      directory: path.resolve(__dirname, './socketIO/helpers/actions'),
      enabled: {
        echo: 'echo',
      },
      transports: [ActionTransport.socketIO],
    },
    extensions: {
      register: [],
    },
  },
  socketIO: {
    router: {
      enabled: true,
    },
    options: {},
  },
};
