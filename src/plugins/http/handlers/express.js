const express = require('express');
const isPlainObject = require('lodash/isPlainObject');

function createApplication(config) {
  const application = express();
  const properties = config.properties;

  if (isPlainObject(properties)) {
    Object.keys(properties).forEach((key) => application.set(key, properties[key]));
  }

  return application;
}

module.exports = createApplication;
