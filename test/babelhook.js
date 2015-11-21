// This file is required in mocha.opts
// The only purpose of this file is to ensure
// the babel transpiler is activated prior to any
// test code, and using the same babel options

require('babel-core/register')({
  optional: [ 'es7.objectRestSpread', 'es7.classProperties', 'es7.decorators' ],
});

// make sure we have stack
require('chai').config.includeStack = true;

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
};
