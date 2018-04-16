const path = require('path');

module.exports = {
  "extends": [
    "standard-jsdoc",
    "plugin:flowtype/recommended",
    "makeomatic"
  ],
  "rules": {
    "no-use-before-define": ["error", { "functions": false, "classes": true, "variables": true }],
    "no-restricted-syntax": [0, {
      selector: "ForOfStatement"
    }]
  },
  "plugins": [
    "flowtype"
  ],
  "settings": {
    "import/resolver": {
      "eslint-import-resolver-lerna": {
        "packages": path.resolve(__dirname, "./packages")
      }
    }
  }
};
