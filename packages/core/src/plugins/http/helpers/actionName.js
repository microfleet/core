"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function fromPathToName(path, prefix) {
    const { length } = prefix;
    const start = length ? length + 2 : 1;
    const end = path[path.length - 1] === '/' ? -1 : undefined;
    return path.slice(start, end).replace(/\//g, '.');
}
exports.fromPathToName = fromPathToName;
function fromNameToPath(name, prefix) {
    const actionName = prefix.length ? `/${prefix}/${name}` : `/${name}`;
    return actionName.replace(/\./g, '/');
}
exports.fromNameToPath = fromNameToPath;
//# sourceMappingURL=actionName.js.map