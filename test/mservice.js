const { expect } = require('chai');

describe('Mservice suite', function testSuite() {
  const Mservice = require('../src');

  it('creates service with no plugins', function test() {
    expect(() => {
      return new Mservice({ plugins: [] });
    }).to.not.throw();
  });

  it('creates service with default configuration', function test() {
    expect(() => {
      return new Mservice();
    }).to.not.throw();
  });
});
