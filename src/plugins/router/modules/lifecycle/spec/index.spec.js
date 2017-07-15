const { expect } = require('chai');
const moduleLifecycle = require('..');
const Errors = require('common-errors');
const Extensions = require('./../../../extensions');
const Promise = require('bluebird');

describe('router: module lifecycle', function suite() {
  it('should reject "module" argument error', function test() {
    const extensions = new Extensions();

    return moduleLifecycle({}, () => {}, extensions, [])
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: module');
      });
  });

  it('should reject "promiseFactory" argument error', function test() {
    const extensions = new Extensions();

    return moduleLifecycle('foo', 'promiseFactory', extensions, [])
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: promiseFactory');
      });
  });

  it('should reject "extensions" argument error', function test() {
    return moduleLifecycle('foo', () => {}, [], [])
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: extensions');
      });
  });

  it('should reject "args" argument error', function test() {
    const extensions = new Extensions();

    return moduleLifecycle('foo', () => {}, extensions, '')
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.instanceof(Errors.ArgumentError);
        expect(error.message).to.be.equals('Invalid or missing argument supplied: args');
      });
  });

  it('should return error from "pre-handler"', function test() {
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

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        const error = inspection.reason();
        expect(error).to.be.equals('error: bar');
      });
  });

  it('should return result from handler with "pre-handler"', function test() {
    const extensions = new Extensions({
      enabled: ['preFoo'],
      register: [
        [
          { point: 'preFoo', handler: (foo, bar) => Promise.resolve([bar, 'baz']) },
        ],
      ],
    });
    const handler = (bar, baz) => Promise.resolve(`result: ${baz}`);

    return moduleLifecycle('foo', handler, extensions, ['bar', 'foo'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: baz');
      });
  });

  it('should return result from handler with "pre-handler" that takes one argument', () => {
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

    return moduleLifecycle('foo', handler, extensions, ['foo'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: foo bar baz');
      });
  });

  it('should return result from handler', function test() {
    const extensions = new Extensions();
    const handler = (foo, bar) => Promise.resolve(`result: ${bar}`);

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: bar');
      });
  });

  it('should return error from handler', function test() {
    const extensions = new Extensions();
    const handler = (foo, bar) => Promise.reject(`result error: ${bar}`);

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('result error: bar');
      });
  });

  it('should return error from post-handler', function test() {
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

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('error: foo.bar');
      });
  });

  it('should be able to modify result if no error returned from handler', function test() {
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

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('baz');
      });
  });

  it('should be able to modify error returned from handler', function test() {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          { point: 'postFoo', handler: (error, result) => Promise.resolve(['baz', result]) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.reject(`${foo}.${bar}`);

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('baz');
      });
  });

  it('should be able to pass arguments to post-handler', function test() {
    const extensions = new Extensions({
      enabled: ['postFoo'],
      register: [
        [
          { point: 'postFoo', handler: (error, result, foo, bar) => Promise.resolve([foo + bar]) },
        ],
      ],
    });
    const handler = (foo, bar) => Promise.resolve(`${foo}.${bar}`);

    return moduleLifecycle('foo', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason()).to.be.equals('foobar');
      });
  });
});
