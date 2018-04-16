const path = require('path');

describe('Validation', () => {
  const Validation = require('../src');
  const CORRECT_PATH = path.resolve(__dirname, './fixtures');
  const BAD_PATH = path.resolve(__dirname, './notexistant');
  const EMPTY_PATH = path.resolve(__dirname, './fixtures/empty');
  const RELATIVE_PATH = './fixtures';

  let validator;

  beforeEach(async () => {
    validator = new Validation();
    await validator.init(CORRECT_PATH);
  });

  it('should successfully init', () => {
    expect(typeof validator.ajv.getSchema('custom')).toBe('function');
    expect(typeof validator.ajv.getSchema('core-no-id')).toBe('function');
    expect(typeof validator.ajv.getSchema('nested.no-id')).toBe('function');
  });

  it('should successfully init with a relative path', async () => {
    await validator.init(RELATIVE_PATH, true);
    expect(typeof validator.ajv.getSchema('custom')).toBe('function');
    expect(typeof validator.ajv.getSchema('core-no-id')).toBe('function');
    expect(typeof validator.ajv.getSchema('nested.no-id')).toBe('function');
  });

  it('should reject promise with an IO Error on invalid dir', async () => {
    expect.assertions(1);
    await expect(validator.init(BAD_PATH, true)).rejects.toThrow();
  });

  it('should reject promise with a file not found error on an empty dir', async () => {
    expect.assertions(1);
    await expect(validator.init(EMPTY_PATH, true)).rejects.toThrow();
  });

  it('should reject promise with a NotFoundError on a non-existant validator', () => {
    expect(() => validator.ifError('bad-route', {})).toThrow();
  });

  it('should validate a correct object', () => {
    const result = validator.ifError('custom', { string: 'not empty' });
    expect(result).toEqual({ string: 'not empty' });
  });

  it('should filter extra properties', () => {
    const result = validator.ifError('custom', { string: 'not empty' });
    expect(result).toEqual({ string: 'not empty' });
  });

  it('should return validation error on an invalid object', async () => {
    validator = new Validation({
      schemaOptions: {
        removeAdditional: false,
        allErrors: true,
        coerceTypes: false,
      },
    });
    await validator.init(CORRECT_PATH);
    const doc = { string: 10, extraneous: true };
    expect(() => validator.ifError('custom', doc))
      .toThrow('should NOT have additional property "data.extraneous", "data.string" should be string');
  });

  it('doesn\'t throw on ifError', () => {
    validator.ifError('custom', { string: 'not empty', extra: true });
  });
});
