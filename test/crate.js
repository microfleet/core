const {expect} = require('chai')

describe('Crate.io suite', function testSuite() {
  const Mservice = require('../src');

  describe('single server', function () {
    it('able to connect to crate.io when plugin is included', function test() {
      this.service = new Mservice({
        plugins: ['validator', 'crate'],
        crate: global.SERVICES.crate
      });

      return this.service.connect()
        .reflect()
        .then(result => {
          expect(result.isFulfilled()).to.be.eq(true);
          return Promise.resolve(result.value());
        })
        .spread(crate => {
          // try to execute simple query to confirm it works
          return crate.execute('create table test (id string primary key)');
        })
        .then(() => {
          expect(() => {
            return this.service.crate;
          }).to.not.throw();
        });
    });

    it('able to close connection to crate', function test() {
      return this.service.close()
        .reflect()
        .then(result => {
          expect(result.isFulfilled()).to.be.eq(true);
          expect(() => {
            return this.service.crate;
          }).to.throw();
        });
    });
  });

  describe('cluster', function () {
    it('able to connect to crate.io when plugin is included', function test() {
      this.service = new Mservice({
        plugins: ['validator', 'crate'],
        crate: global.SERVICES.crate_cluster
      });

      return this.service.connect()
        .reflect()
        .then(result => {
          expect(result.isFulfilled()).to.be.eq(true);
          return Promise.resolve(result.value());
        })
        .spread(crate => {
          // try to execute simple query to confirm it works
          return crate.execute('create table test (id string primary key)');
        })
        .then(() => {
          expect(() => {
            return this.service.crate;
          }).to.not.throw();
        });
    });

    it('able to close connection to crate', function test() {
      return this.service.close()
        .reflect()
        .then(result => {
          expect(result.isFulfilled()).to.be.eq(true);
          expect(() => {
            return this.service.crate;
          }).to.throw();
        });
    });
  });
});
