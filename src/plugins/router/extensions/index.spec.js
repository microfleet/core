const { expect } = require('chai');
const Errors = require('common-errors');
const Extensions = require('./');

describe('router: extensions', function suite() {
  it('should be able to auto register extension', () => {
    const config = {
      enabled: [
        'preHandler',
        'postHandler',
      ],
      register: {
        postHandler: [
          result => Promise.resolve(result),
        ],
      },
    };
    const extensions = new Extensions(config);

    expect(() => {
      extensions.register('preHandler', args => Promise.reject(args));
    }).to.not.throw();

    expect(() => {
      extensions.exec('postPreHandler', [{}]);
    }).to.throw(Errors.NotSupportedError, 'postPreHandler');

    return extensions.exec('postHandler', [{}]);
  });
});
