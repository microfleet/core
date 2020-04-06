"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readPkgUp = require("read-pkg-up");
const assert = require("assert");
function getVersion() {
    const pkgUp = readPkgUp.sync();
    const version = pkgUp && pkgUp.packageJson && pkgUp.packageJson.version || '';
    assert(version, 'unable to find package.json or .version does not exist');
    return version;
}
exports.getVersion = getVersion;
//# sourceMappingURL=packageInfo.js.map