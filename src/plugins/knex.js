const _require = require('../utils/require');
const assert = require('assert');
const Errors = require('common-errors');
const { PluginsTypes } = require('../');

const factory = _require('knex');

function attachKnex(config = {}) {
  const service = this;

  if (this._log === undefined) {
    throw new Errors.NotFoundError('log module must be included');
  }

  if (this._validator === undefined) {
    throw new Errors.NotFoundError('validator module must be included');
  }

  assert.ifError(this.validator.validateSync('knex', config).error);
  assert.ifError(this.validator.validateSync(`knex.${config.client}`, config).error);

  const knex = this._knex = factory(config);

  return {
    connect: function connectKnex() {
      return knex
        .raw('SELECT TRUE;')
        .then((result) => {
          assert.equal(result.rows[0].bool, true);

          service.addMigrator('knex', () => knex.migrate.latest());
          service.emit('plugin:connect:knex', knex);

          return knex;
        });
    },

    close: function disconnectKnex() {
      return knex
        .destroy()
        .then(() => service.emit('plugin:close:knex'));
    },
  };
}

module.exports = {
  attach: attachKnex,
  name: 'knex',
  type: PluginsTypes.database,
};
