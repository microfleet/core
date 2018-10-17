import Bluebird = require('bluebird');
import { expect } from 'chai';
import moduleLifecycle from '..';
import Extensions from './../../../extensions';

describe('router: module lifecycle', () => {
  it('should return error from "pre-handler"', async () => {
    const extensions = new Extensions({
      enabled: ['preAuth'],
      register: [
        [
          { point: 'preAuth', handler: (foo, bar) => Bluebird.resolve([foo, bar]) },
          { point: 'preAuth', handler: (_, bar) => Bluebird.reject(new Error(`error: ${bar}`)) },
        ],
      ],
    });

    const handler = (_: string, bar: any) => Bluebird.resolve(`result: ${bar}`);

    const inspection = await moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect();

    const error = inspection.reason();
    expect(error.message).to.be.equals('error: bar');
  });

  it('should return result from handler with "pre-handler"', () => {
    const extensions = new Extensions({
      enabled: ['preAuth'],
      register: [
        [
          { point: 'preAuth', handler: (_, bar) => Bluebird.resolve([bar, 'baz']) },
        ],
      ],
    });
    const handler = (_: string, baz: string) => Bluebird.resolve(`result: ${baz}`);

    return moduleLifecycle('auth', handler, extensions, ['bar', 'foo'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: baz');
      });
  });

  it('should return result from handler with "pre-handler" that takes one argument', () => {
    const extensions = new Extensions({
      enabled: ['preAuth'],
      register: [
        [
          { point: 'preAuth', handler: (request: string) => Bluebird.resolve(`${request} bar`) },
          { point: 'preAuth', handler: (request: string) => Bluebird.resolve(`${request} baz`) },
        ],
      ],
    });
    const handler = (request: string) => Bluebird.resolve(`result: ${request}`);

    return moduleLifecycle('auth', handler, extensions, ['foo'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: foo bar baz');
      });
  });

  it('should return result from handler', () => {
    const extensions = new Extensions();
    const handler = (_: string, bar: string) => Bluebird.resolve(`result: ${bar}`);

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('result: bar');
      });
  });

  it('should return error from handler', () => {
    const extensions = new Extensions();
    const handler = (_: string, bar: string) => Bluebird.reject(new Error(`result error: ${bar}`));

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason().message).to.be.equals('result error: bar');
      });
  });

  it('should return error from post-handler', () => {
    const extensions = new Extensions({
      enabled: ['postAuth'],
      register: [
        [
          { point: 'postAuth', handler: (error, result) => Bluebird.resolve([error, result]) },
          { point: 'postAuth', handler: (_, result) => Bluebird.reject(new Error(`error: ${result}`)) },
        ],
      ],
    });
    const handler = (foo: any, bar: string) => Bluebird.resolve(`${foo}.${bar}`);

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason().message).to.be.equals('error: foo.bar');
      });
  });

  it('should be able to modify result if no error returned from handler', () => {
    const extensions = new Extensions({
      enabled: ['postAuth'],
      register: [
        [
          {
            handler: (error, _) => Bluebird.resolve([error, 'baz']),
            point: 'postAuth',
          },
        ],
      ],
    });
    const handler = (foo: string, bar: string) => Bluebird.resolve(`${foo}.${bar}`);

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.value()).to.be.equals('baz');
      });
  });

  it('should be able to modify error returned from handler', () => {
    const extensions = new Extensions({
      enabled: ['postAuth'],
      register: [
        [
          { point: 'postAuth', handler: (_, result) => [new Error('baz'), result] },
        ],
      ],
    });
    const handler = (foo: string, bar: string) => Bluebird.reject(new Error(`${foo}.${bar}`));

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason().message).to.be.equals('baz');
      });
  });

  it('should be able to pass arguments to post-handler', () => {
    const extensions = new Extensions({
      enabled: ['postAuth'],
      register: [
        [
          { point: 'postAuth', handler: (_, __, foo, bar) => [new Error(foo + bar)] },
        ],
      ],
    });
    const handler = (foo: string, bar: string) => Bluebird.resolve(`${foo}.${bar}`);

    return moduleLifecycle('auth', handler, extensions, ['foo', 'bar'])
      .reflect()
      .then((inspection) => {
        expect(inspection.reason().message).to.be.equals('foobar');
      });
  });
});
