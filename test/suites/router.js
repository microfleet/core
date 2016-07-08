const { expect } = require('chai');
const path = require('path');
const SocketIOClient = require('socket.io-client');

describe('Router suite', function testSuite() {
  const MService = require('../../src');

  it('should throw error if plugin is not included', function test() {
    const service = new MService({ plugins: [] });
    expect(() => service.router).to.throw();
  });

  it('###', function test(done) {
    const service = new MService({
      plugins: [ /*'validator',*/ 'validator', 'router', 'socketio' ],
      router: {
        actions: {
          directory: path.resolve(__dirname, './../router/actions'),
          enabled: {
            'foo': 'bar'
          },
          prefix: 'action',
          transports: ['amqp', 'http', 'socketIO']
        },
      },
      socketio: {
        service: {
          actionsDirectory: `${__dirname}/actions/socketio`,
        },
        server: {
          options: {},
        },
      }
    });

    service.socketio.listen(3000);
    const client = SocketIOClient('http://0.0.0.0:3000');
    client.emit('action', { action: 'action.bar' }, (error, result) => {
      console.log(error, result);
    });

    console.log(service.router);
  });
});


//const service = new Mservice({
//  plugins: ['validator', 'socketio'],
//  socketio: global.SERVICES.socketio,
//});
//service.socketio.listen(3000);
//const client = SocketIOClient('http://0.0.0.0:3000');
//client.on('echo', data => {
//  expect(data.message).to.be.eq('foo');
//  service.socketio.close();
//  done();
//});
//client.emit('echo', { message: 'foo' });
