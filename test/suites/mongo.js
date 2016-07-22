const path = require('path');
const is = require('is');
const { expect } = require('chai');

describe('Mongo suite', function testSuite() {
  const Mservice = require('../../src');
  const Mongoose = require('mongoose');

  it('when service does not include `mongo` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.mongo).to.throw();
  });

  it('able to connect to mongo when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'mongo'],
      mongo: global.SERVICES.mongo,
    });
    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(mng => {
        expect(mng).to.be.instanceof(Mongoose);
        expect(() => this.service.mongo).to.not.throw();
      });
  });

  it('able to close connection to mongo', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => this.service.mongo).to.throw();
      });
  });

// ... probably cluster tests

});
