'use strict';

var _require = require('chai');

const expect = _require.expect;

const Errors = require('common-errors');
const Extensions = require('./');
const Promise = require('bluebird');

describe('router: extensions', function suite() {
  it('should be able to auto register extension', () => {
    const config = {
      enabled: ['preHandler', 'postHandler'],
      register: {
        postHandler: [result => Promise.resolve([result])]
      }
    };
    const extensions = new Extensions(config);

    expect(() => {
      extensions.register('preHandler', args => Promise.reject(args));
    }).to.not.throw();

    return extensions.exec('postHandler', ['foo']);
  });

  it('should not be able to execute unknown extension', done => {
    const extensions = new Extensions();
    extensions.exec('postPreHandler', ['foo']).reflect().then(inspection => {
      const error = inspection.reason();
      expect(error).to.be.instanceof(Errors.NotSupportedError);
      expect(error.message).to.be.equals('Not Supported: postPreHandler');
      done();
    });
  });
});