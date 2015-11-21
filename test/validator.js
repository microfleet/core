const { expect } = require('chai');

describe('Validator suite', function testSuite() {
  const Mservice = require('../src');

  it('when service does not include `validator` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => {
      return service.validator;
    }).to.throw();
  });

  it('validator inits relative schema paths', function test() {
    expect(() => {
      this.service = new Mservice({
        plugins: [ 'validator'],
        validator: [ './fixtures' ],
      });
    }).to.not.throw();

    expect(this.service.validator.validators).to.have.ownProperty('test');
  });

  it('validator exposes validate methods on the service', function test() {
    expect(this.service).to.have.ownProperty('validate');
    expect(this.service).to.have.ownProperty('validateSync');
    expect(this.service.validate).to.be.a('function');
    expect(this.service.validateSync).to.be.a('function');
  });
});
