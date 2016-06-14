const { expect } = require('chai');
const express = require('express');
const http = require('http');

describe('Http server with \'express\' handler suite', function testSuite() {
  const Mservice = require('../src');

  it('should start \'express\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'http'],
      http: global.SERVICES.http,
    });

    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(servers => Promise.resolve(servers))
      .spread(httpServer => {
        expect(httpServer).to.be.instanceof(http.Server);
        expect(this.service.http).to.be.instanceof(http.Server);
        expect(this.service.httpHandler).to.be.instanceof(Function);
        expect(this.service.httpHandler.get('x-powered-by')).to.be.equals('mservice test');
      });
  });

  it('should can add routes after start', function test(done) {
    const application = this.service.httpHandler;
    const router = express.Router();
    router.use('/bar', function(req, res, next) {
      res.send('/bar route');
      next();
    });
    application.use('/', router);

    http.get('http://0.0.0.0:3000/bar', (res) => {
      let body = '';

      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        expect(body).to.be.equals('/bar route');
        done();
      });
    }).on('error', (error) => {
      done(error);
    });
  });

  it('should be able to stop \'express\' http server', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(() => {
        expect(this.service.http.listening).to.be.eq(false);
      });
  });
});
