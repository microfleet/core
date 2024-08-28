# Service Request

## Overview and Motivation
The Service handles incoming messages via several action Transports. On each incoming message Transport Router Adapter
builds an object with `ServiceRequest` type and passes it to the Dispatcher. There is no common constructor function now.
This object becomes available in the Action Handler as an argument. Its structure is abstract and functionality is
basically transport-agnostic.

Considering Node V8 hidden classes concept, to minimize hidden class trees number and respectfully maximize the
performance, the Service Request instance must always aim to have same object shape and its properties initialization
order. In order to make it even more performant we have to choose functions over ES6 classes for the Service Request
implementation. Due to that we need to use **single constructor function** to instantiate Service Request objects
anywhere.

## Service Request Interface

### Properties

#### `.transport: TransportTypes`
Transport name that handles the incoming request.

#### `.method: RequestMethods`
Request method.

Virtual value, which, depending on transport design, should either preserve its original request method name or provide
its custom name.

#### `.query: object`
Original message may contain query params.

Transport Router Adapter should extract query data and set it as query.

Notice that `.query` value may be possibly modified during the Request step of the Validation Lifecycle: it could be
filtered, assigned by default values and underlying data types could be coerced.

#### `.headers: any`
Original message may contain request headers. Transport Router Adapter should extract headers data and set it as params.
The responsibility for extracting request headers and setting it to the Service Request must lay on the
Transport Router Adapter implementation.

#### `.params: any`
Original message may contain params.

Transport Router Adapter should extract request data and set it as params.

Notice that `.params` value may be possibly modified during the Request step of the Validation Lifecycle: it could be
filtered, assigned by default values and underlying data types could be coerced.

#### `.transportRequest?: any`
Third-party request instance.

#### `.log?: { trace(...args: any[]): void; debug(...args: any[]): void; info(...args: any[]): void; warn(...args: any[]): void; error(...args: any[]): void; fatal(...args: any[]): void; }`
Router must set Log child instance with a unique Request identifier.

#### `.socket?: NodeJS.EventEmitter`
In order to provide web sockets protocol support we need to operate on socket instance. It should be set whenever
socket instance is available.

#### `.parentSpan`
When a Tracer is enabled, property may hold a tracer parent span, which context must be supplied by the Transport.

#### `.route: string`
Route name may contain two parts joined by dot - optional Router prefix and required path to the Action Handler,
transformed to dot case. It shall result into the following format:
```
'router-prefix.path.to.the.action.handler'
```
Assuming that the Router plugin prefix configured as `'payments'`, the path to the action
relative to the routes directory defined by Router plugin configuration is `'transactions/create'`, resulting route
value will be `payments.transactions.create`.

*Notice: Route name should be transport-agnostic and therefore must not contain Transport route prefix.*

Route name must be set during the Request step of the Request Lifecycle.

#### `.action: ServiceAction`
When the route match is found, the Router must provide an Action instance to the Service Request.

Action must be set during the Request step of the Request Lifecycle.

#### `.auth: any`
Original message may contain authentication data. Considering the Action authentication strategy it may be resolved
during the Auth step of Request Lifecycle and set as the `.auth` property value.

#### `.span`
When a Tracer is enabled, property must hold a tracer span, initialized as a `.parentSpan` child.

#### `.locals`
By design, this property recommended usage is to share data between Request Lifecycle steps, as well as pass it through
when using Internal Transport. Could be set anywhere during the Request Lifecycle.

#### `.reformatError`
Flag that defines whether to transform the error or keep to the original one.

#### `.error`
Request error.

