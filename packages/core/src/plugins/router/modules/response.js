"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serialization_1 = require("@microfleet/transport-amqp/lib/utils/serialization");
const validation_1 = require("@microfleet/validation");
const boom_1 = require("@hapi/boom");
const Bluebird = require("bluebird");
const common_errors_1 = require("common-errors");
const lifecycle_1 = require("./lifecycle");
function response(err, result) {
    if (err) {
        switch (err.constructor) {
            case common_errors_1.AuthenticationRequiredError:
            case common_errors_1.ConnectionError:
            case common_errors_1.HttpStatusError:
            case validation_1.HttpStatusError:
            case common_errors_1.NotImplementedError:
            case common_errors_1.NotFoundError:
            case common_errors_1.NotPermittedError:
            case common_errors_1.NotSupportedError:
            case common_errors_1.TimeoutError:
            case common_errors_1.ValidationError:
            case common_errors_1.Error:
                return Bluebird.reject(err);
        }
        if (err.constructor === serialization_1.MSError) {
            switch (err.name) {
                case 'AuthenticationRequiredError':
                case 'ConnectionError':
                case 'HttpStatusError':
                case 'NotImplementedError':
                case 'NotFoundError':
                case 'NotPermittedError':
                case 'NotSupportedError':
                case 'TimeoutError':
                case 'ValidationError':
                    return Bluebird.reject(err);
            }
        }
        this.log.fatal({ err: boom_1.boomify(err) }, 'unexpected error');
        return Bluebird.reject(new common_errors_1.Error(`Something went wrong: ${err.message}`, err));
    }
    return Bluebird.resolve(result);
}
function responseHandler(params) {
    return lifecycle_1.default('response', response, this.router.extensions, params, this);
}
exports.default = responseHandler;
//# sourceMappingURL=response.js.map