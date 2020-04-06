"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const Errors = require("common-errors");
const _debug = require("debug");
const is = require("is");
const upperFirst = require("lodash/upperFirst");
const extensions_1 = require("../../extensions");
const debug = _debug('mservice:router:module:lifecycle');
function moduleLifecycle(module, promiseFactory, extensions, args, context) {
    if (!is.string(module)) {
        return Bluebird.reject(new Errors.ArgumentError('module'));
    }
    if (!is.fn(promiseFactory)) {
        return Bluebird.reject(new Errors.ArgumentError('promiseFactory'));
    }
    if (!(extensions instanceof extensions_1.default)) {
        return Bluebird.reject(new Errors.ArgumentError('extensions'));
    }
    if (!is.array(args)) {
        return Bluebird.reject(new Errors.ArgumentError('args'));
    }
    debug('lifecycle for module "%s"', module);
    const upperFirstName = upperFirst(module);
    const preModule = `pre${upperFirstName}`;
    const postModule = `post${upperFirstName}`;
    let result;
    if (extensions.has(preModule)) {
        result = Bluebird.resolve([preModule, args, context])
            .bind(extensions)
            .spread(extensions.exec);
    }
    else {
        result = Bluebird.resolve(args);
    }
    return result
        .bind(context)
        .spread(promiseFactory)
        .reflect()
        .then((inspection) => {
        let resultResponse = null;
        let errorResponse = null;
        if (inspection.isFulfilled()) {
            resultResponse = inspection.value();
        }
        else {
            errorResponse = inspection.reason();
        }
        if (!extensions.has(postModule)) {
            if (errorResponse) {
                return Bluebird.reject(errorResponse);
            }
            return resultResponse;
        }
        return Bluebird
            .resolve([postModule, [errorResponse, resultResponse, ...args], context])
            .bind(extensions)
            .spread(extensions.exec)
            .spread((error, response) => {
            if (error) {
                return Bluebird.reject(error);
            }
            return response;
        });
    });
}
exports.default = moduleLifecycle;
//# sourceMappingURL=index.js.map