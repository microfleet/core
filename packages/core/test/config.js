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
    hosts: [
      'http://elasticsearch:9200',
      'http://elasticsearch:9200',
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
  router: {
    routes: {
      directory: path.resolve(__dirname, './router/helpers/actions'),
      enabled: {
        echo: 'echo',
      },
      transports: [ActionTransport.socketio],
    },
    extensions: {
      register: [],
    },
  },
};
