const assert = require('assert');

describe('Validator suite', () => {
  require('../config');
  const { Microfleet } = require('../..');

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
    const { validator } = this.service;
    assert(validator.validate);
    assert(validator.validateSync);
    assert(typeof validator.validate === 'function');
    assert(typeof validator.validateSync === 'function');
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
    assert.equal(this.service.validator.validateSync('test-types-schema', '1').doc, '1');
    assert(!!this.service.validator.ajv.getSchema('config'));
  });
});
