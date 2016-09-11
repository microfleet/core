const { expect } = require('chai');
const moduleLifecycle = require('./');
const Errors = require('common-errors');
const Extensions = require('./../../extensions');
const Promise = require('bluebird');

describe('router: module lifecycle', function suite() {
  it('should reject "module" argument error', function test(done) {
    const extensions = new Extensions();

    moduleLifecycle({}, () => {}, extensions, []).reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: module');
        done();
      });
  });

  it('should reject "promiseFactory" argument error', function test(done) {
    const extensions = new Extensions();

    moduleLifecycle('foo', 'promiseFactory', extensions, []).reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: promiseFactory');
        done();
      });
  });

  it('should reject "extensions" argument error', function test(done) {
    moduleLifecycle('foo', () => {}, [], []).reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: extensions');
        done();
      });
  });

  it('should reject "args" argument error', function test(done) {
    const extensions = new Extensions();

    moduleLifecycle('foo', () => {}, extensions, '').reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: args');
        done();
      });
  });

  it('should return error from "pre-handler"', function test(done) {
    const extensions = new Extensions({
      enabled: ['preFoo'],
      register: [
        [
          { point: 'preFoo', handler: (foo, bar) => Promise.resolve([foo, bar]) },
          { point: 'preFoo', handler: (foo, bar) => Promise.reject(`error: ${bar}`) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.resolve(`result: ${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.equals('error: bar');
        done();
      }
    );
  });

  it('should return result from handler with "pre-handler"', function test(done) {
    const extensions = new Extensions({
      enabled: ['preFoo'],
      register: [
        [
          { point: 'preFoo', handler: (foo, bar) => Promise.resolve([bar, 'baz']) },
        ],
      ],
    });
    const handler = (bar, baz) => Promise.resolve(`result: ${baz}`);

    moduleLifecycle('foo', handler, extensions, ['bar', 'foo']).reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: baz');
        done();
      }
    );
  });

  it('should return result from handler with "pre-handler" that takes one argument', (done) => {
    const extensions = new Extensions({
      enabled: ['preFoo'],
      register: [
        [
          { point: 'preFoo', handler: request => Promise.resolve(`${request} bar`) },
          { point: 'preFoo', handler: request => Promise.resolve(`${request} baz`) },
        ],
      ],
    });
    const handler = request => Promise.resolve(`result: ${request}`);

    moduleLifecycle('foo', handler, extensions, ['foo']).reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: foo bar baz');
        done();
      }
    );
  });

  it('should return result from handler', function test(done) {
    const extensions = new Extensions();
    const handler = (foo, bar) => Promise.resolve(`result: ${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: bar');
        done();
      }
    );
  });

  it('should return error from handler', function test(done) {
    const extensions = new Extensions();
    const handler = (foo, bar) => Promise.reject(`result error: ${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('result error: bar');
        done();
      }
    );
  });

  it('should return error from post-handler', function test(done) {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          { point: 'postFoo', handler: (error, result) => Promise.resolve([error, result]) },
          { point: 'postFoo', handler: (error, result) => Promise.reject(`error: ${result}`) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.resolve(`${foo}.${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('error: foo.bar');
        done();
      }
    );
  });

  it('should be able to modify result if no error returned from handler', function test(done) {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          {
            point: 'postFoo',
            // eslint-disable-next-line no-unused-vars
            handler: (error, result) => Promise.resolve([error, 'baz']),
          },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.resolve(`${foo}.${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('baz');
        done();
      }
    );
  });

  it('should be able to modify error returned from handler', function test(done) {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          { point: 'postFoo', handler: (error, result) => Promise.resolve(['baz', result]) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.reject(`${foo}.${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('baz');
        done();
      }
    );
  });

  it('should be able to pass arguments to post-handler', function test(done) {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          { point: 'postFoo', handler: (error, result, foo, bar) => Promise.resolve([foo + bar]) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.resolve(`${foo}.${bar}`);

    moduleLifecycle('foo', handler, extensions, ['foo', 'bar']).reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('foobar');
        done();
      }
    );
  });
});
