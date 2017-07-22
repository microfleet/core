const Promise = require('bluebird');
const { expect } = require('chai');
const http = require('http');
const Server = require('restify/lib/server');

describe('Http server with \'restify\' handler suite', function testSuite() {
  const Mservice = require('../../src');

  it('should start \'restify\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'http'],
      http: {
        server: {
          handler: 'restify',
          port: 3000,
        },
      },
    });

    return this.service.connect()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread((restifyServer) => {
        expect(restifyServer).to.be.instanceof(Server);
        expect(restifyServer.server).to.be.instanceof(http.Server);
        expect(this.service.http).to.be.instanceof(Server);
        expect(this.service.http.server).to.be.instanceof(http.Server);
      });
  });

  it('should can add routes after start', function test(done) {
    this.service.http.get('/bar', (req, res, next) => {
      res.send('/bar route');
      next();
    });

    http.get('http://0.0.0.0:3000/bar', (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        expect(body).to.be.equals('"/bar route"');
        done();
      });
    }).on('error', (error) => {
      done(error);
    });
  });

  it('should be able to stop \'restify\' http server', function test() {
    this.timeout(10000);

    return this.service.close()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(() => {
        expect(this.service.http.server.listening).to.be.eq(false);
      });
  });

  it('should attach \'socket.io\' when plugin is included', function test() {
    const service = new Mservice({
      plugins: ['validator', 'socketIO', 'http'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'restify',
          port: 3000,
        },
      },
      socketIO: {},
    });

    return service.connect().then(() => {
      expect(service.socketIO.httpServer).to.be.instanceof(Server);
      return service.close();
    });
  });
});
