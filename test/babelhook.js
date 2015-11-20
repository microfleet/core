// This file is required in mocha.opts
// The only purpose of this file is to ensure
// the babel transpiler is activated prior to any
// test code, and using the same babel options

require('babel-core/register')({
  optional: [ 'es7.objectRestSpread', 'es7.classProperties', 'es7.decorators' ],
});

global.SERVICES = {
  redis: {
    hosts: [
      {
        host: process.env.IP,
        port: process.env.REDIS_1,
      },
      {
        host: process.env.IP,
        port: process.env.REDIS_2,
      },
      {
        host: process.env.IP,
        port: process.env.REDIS_3,
      },
    ],
    options: {},
  },
  amqp: {
    connection: {
      host: process.env.IP,
      port: process.env.RABBITMQ,
    },
  },
};
