const glob = require('glob');
const Errors = require('common-errors');
const fs = require('fs');
const is = require('is');
const path = require('path');
const SocketIO = require('socket.io');

function getActions(actionsDirectory, validator) {
  if (!fs.existsSync(actionsDirectory)) {
    const error = new Errors.Error(`${actionsDirectory} does not exist`);
    throw new Errors.ArgumentError('actionsDirectory', error);
  }

  function initActions(actions, file) {
    const actionName = path.basename(file.replace(/\//g, '.'), '.js');
    // eslint-disable global-require
    const action = require(path.join(actionsDirectory, file));
    // eslint-enable global-require

    if (is.fn(action.handler) === false) {
      return actions;
    }

    let handler = action.handler;

    if (is.object(action.params)) {
      const validatorName = `socketio_actions_${actionName}`;
      validator.ajv.addSchema(action.params, validatorName);
      handler = function preValidate(data) {
        const socket = this;
        validator.validate(validatorName, data)
          .then(params => action.handler.call(socket, params))
          .catch(error => socket.error(error));
      };
    }

    actions[actionName] = { handler };

    return actions;
  }

  return glob
    .sync('**/*.js', { cwd: actionsDirectory })
    .reduce(initActions, {});
}

function attachSocketIO(config = {}) {
  if (is.fn(this.validateSync)) {
    const isConfigValid = this.validateSync('socketio', config);

    if (isConfigValid.error) {
      throw isConfigValid.error;
    }
  }

  const socketio = new SocketIO(config.server.options);

  if (config.service.actionsDirectory) {
    const actions = getActions(config.service.actionsDirectory, this.validator);
    socketio.on('connection', socket => {
      Object.keys(actions).forEach((action) => socket.on(action, actions[action].handler));
    });
  }

  this._socketio = socketio;
}

module.exports = {
  attach: attachSocketIO,
  name: 'socketio',
};
