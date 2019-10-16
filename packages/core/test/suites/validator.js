const assert = require('assert');

describe('Validator suite', () => {
  require('../config');
  const { Microfleet } = require('../../src');

  it('no `validator` plugin, it emits an error or throws', function test() {
    const service = new Microfleet({ name: 'tester', plugins: [] });
    assert(!service.validator);
  });

  it('validator inits relative schema paths', function test() {
    assert.doesNotThrow(() => {
      this.service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: { schemas: ['../fixtures'] },
      });
    });

    assert(!!this.service.validator.ajv.getSchema('test-schema'));
    assert(!!this.service.validator.ajv.getSchema('config'));
  });

  it('validator exposes validate methods on the service', function test() {
    assert(this.service.validate);
    assert(this.service.validateSync);
    assert(typeof this.service.validate === 'function');
    assert(typeof this.service.validateSync === 'function');
  });

  it('validator throw on invalid config when `config` schema is present', function test() {
    assert.throws(() => {
      this.service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: { schemas: ['../fixtures'] },
        invalid: 'mwhaha',
      });
    });
  });

  it('should be able to load config as object', () => {
    assert.doesNotThrow(() => {
      this.service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: {
          schemas: ['../fixtures'],
          ajv: {
            coerceTypes: true,
          },
        },
      });
    });

    assert(!!this.service.validator.ajv.getSchema('test-schema'));
    assert.equal(this.service.validateSync('test-types-schema', '1').doc, '1');
    assert(!!this.service.validator.ajv.getSchema('config'));
  });
});
