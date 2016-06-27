// make sure we have stack
require('chai').config.includeStack = true;
const cassandra = require('express-cassandra');

global.SERVICES = {
  redis: {
    hosts: [
      {
        host: process.env.REDIS_1_PORT_6379_TCP_ADDR,
        port: process.env.REDIS_1_PORT_6379_TCP_PORT,
      },
      {
        host: process.env.REDIS_2_PORT_6379_TCP_ADDR,
        port: process.env.REDIS_2_PORT_6379_TCP_PORT,
      },
      {
        host: process.env.REDIS_3_PORT_6379_TCP_ADDR,
        port: process.env.REDIS_3_PORT_6379_TCP_PORT,
      },
    ],
    options: {},
  },
  amqp: {
    connection: {
      host: process.env.RABBITMQ_PORT_5672_TCP_ADDR,
      port: process.env.RABBITMQ_PORT_5672_TCP_PORT,
    },
  },
  redisSentinel: {
    sentinels: [
      {
        host: process.env.REDIS_SENTINEL_PORT_26379_TCP_ADDR,
        port: process.env.REDIS_SENTINEL_PORT_26379_TCP_PORT,
      },
    ],
    name: 'mservice',
    options: {},
  },
  elasticsearch: {
    hosts: [
      {
        host: process.env.ELASTICSEARCH_PORT_9200_TCP_ADDR,
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
          fields:{
            bar: 'text'
          },
          key:['bar']
        }
      }
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
          consistency: cassandra.consistencies.one
        }
      },
      ormOptions: {
        defaultReplicationStrategy : {
          class: 'SimpleStrategy',
          replication_factor: 1
        },
        dropTableOnSchemaChange: false,
        createKeyspace: true
      }
    }
  },
  http: {
    server: {
      attachSocketIO: true,
      handler: 'restify',
      handlerConfig: {},
      port: 3000,
    }
  },
  socketio: {
    service: {
      actionsDirectory: __dirname + '/actions/socketio',
    },
    server: {
      options: {},
    }
  }
};
