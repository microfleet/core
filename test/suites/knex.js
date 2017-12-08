const assert = require('assert');
const Mservice = require('../../src');
const { inspectPromise } = require('@makeomatic/deploy');

describe('knex plugin', function testSuite() {
  it('should be able to throw error if plugin is not included', function test() {
    const service = new Mservice({ plugins: [] });
    assert.throws(() => service.knex);
  });

  it('should be able to initialize', function test() {
    this.service = new Mservice({
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@pg:5432/postgres',
      },
    });

    assert.ok(this.service.knex);
  });

  it('should be able to connect', function test() {
    return this.service
      .connect()
      .reflect()
      .then(inspectPromise())
      .spread((knex) => {
        // default settings in
        assert.ok(knex.client.pool._count >= 2 && knex.client.pool._count <= 4);
      });
  });

  it('should be able to make query', function test() {
    const { knex } = this.service;

    return knex
      .raw('SELECT datname FROM pg_database WHERE datistemplate = false;')
      .then((result) => {
        assert.equal(result.rows[0].datname, 'postgres');
      });
  });

  it('should be able to disconnect', function test() {
    return this.service
      .close()
      .reflect()
      .then(inspectPromise())
      .then(() => {
        assert.equal(this.service.knex.client.pool, undefined);
      });
  });

  it('should be able to run migrations', function test() {
    const service = new Mservice({
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@pg:5432/postgres',
      },
    });

    service.addConnector(
      Mservice.ConnectorsTypes.migration,
      () => service.migrate('knex')
    );

    return service
      .connect()
      .reflect()
      .then(inspectPromise(false))
      .then((reason) => {
        // causes error because there are no migrations to execute
        assert.equal(reason.path, '/src/migrations');
      })
      .finally(() => service.close());
  });

  after('close', () => (
    this.service && this.service.close()
  ));
});
