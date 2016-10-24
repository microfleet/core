const assert = require('assert');
const Mservice = require('../../src');

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
      .then(result => {
        assert.ok(result.isFulfilled());

        return Promise.resolve(result.value());
      })
      .spread(knex => {
        assert.equal(knex.client.pool._count, 3);
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
      .then(result => {
        assert.ok(result.isFulfilled());
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
      Mservice.ConnectorsGroups.connectors,
      Mservice.ConnectorsTypes.migration,
      () => service.migrate('knex')
    );

    return service
      .connect()
      .reflect()
      .then((inspection) => {
        // causes error because there are no migrations to execute
        assert.equal(inspection.reason().path, '/src/migrations');
      });
  });
});
