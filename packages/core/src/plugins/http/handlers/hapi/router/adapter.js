"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("@microfleet/validation");
const Bluebird = require("bluebird");
const Errors = require("common-errors");
const noop = require("lodash/noop");
const opentracing_1 = require("opentracing");
const __1 = require("../../../../..");
const require_1 = require("../../../../../utils/require");
function getHapiAdapter(actionName, service) {
    const Boom = require_1.default('@hapi/boom');
    const router = service.router;
    const reformatError = (error) => {
        let statusCode;
        let errorMessage;
        const { errors } = error;
        switch (error.constructor) {
            case Errors.AuthenticationRequiredError:
                statusCode = 401;
                break;
            case Errors.ValidationError:
                statusCode = 400;
                break;
            case Errors.NotPermittedError:
                statusCode = 403;
                break;
            case Errors.NotFoundError:
                statusCode = 404;
                break;
            default:
                statusCode = error.statusCode || 500;
        }
        if (Array.isArray(errors) && errors.length > 0) {
            if (error.constructor === validation_1.HttpStatusError) {
                errorMessage = error.message ? undefined : errors.map(e => `${e.field} ${e.message}`).join(';');
            }
            else {
                const [nestedError] = errors;
                errorMessage = nestedError.text || nestedError.message || undefined;
            }
        }
        const replyError = Boom.boomify(error, { statusCode, message: errorMessage });
        if (error.name) {
            replyError.output.payload.name = error.name;
        }
        return replyError;
    };
    // pre-wrap the function so that we do not need to actually do fromNode(next)
    const dispatch = Bluebird.promisify(router.dispatch, { context: router });
    return async function handler(request) {
        const { headers } = request;
        let parentSpan;
        if (service.tracer !== undefined) {
            parentSpan = service.tracer.extract(headers, opentracing_1.FORMAT_HTTP_HEADERS);
        }
        const serviceRequest = {
            // defaults for consistent object map
            // opentracing
            // set to console
            // transport type
            headers,
            parentSpan,
            action: noop,
            locals: Object.create(null),
            log: console,
            method: request.method.toLowerCase(),
            params: request.payload,
            query: request.query,
            route: '',
            span: undefined,
            transport: __1.ActionTransport.http,
            transportRequest: request,
        };
        let response;
        try {
            response = await dispatch(actionName, serviceRequest);
        }
        catch (e) {
            response = reformatError(e);
        }
        return response;
    };
}
exports.default = getHapiAdapter;
//# sourceMappingURL=adapter.js.map