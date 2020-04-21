# Service Request
   
## Overview and Motivation
The Service handles incoming messages via several action Transports. On each incoming message Transport Router Adapter 
builds a Service Request instance and passes it to the Dispatcher. This instance becomes available in the Action Handler 
as an argument. Its structure is abstract and functionality is basically transport-agnostic.


Most transport protocols natively have headers in messages. While currently every Transport Router Adapter is able to 
parse incoming messages including its optional headers, in order to fully support messaging protocols the Service should 
provide a way to set, modify and remove response message headers.


Although every transport could have its own protocol limitations (considerations) over the headers, the Service Request 
instance could only take responsibility for collecting them. In order to be able to validate and adapt resulting 
collection independently, these tasks should be performed on the Transport level.  


Considering Node V8 hidden classes concept, in order to minimize hidden class trees number and respectfully maximize the 
performance, the Service Request instance must always aim to have same object shape and its properties initialization 
order. 
Our secret Node.JS performance expert claims that functions work even faster regarding hidden class optimization than
ES6 classes.
To meet these requirements the Service Request must be initialized using functions and preset every property value on
construction.

## Service Request Interface

### Properties

#### `.transport: TransportTypes`
Transport name that handles the incoming request.

Must be set by Transport Router Adapter.

#### `.method: RequestMethods`
Request method. 

Virtual value, which, depending on transport design, should either preserve its original request method name or provide 
its custom name.

Must be set by Transport Router Adapter.

#### `.query: object`
Original message may contain query params.

Transport Router Adapter should extract query data and set it as query. 

Notice that `.query` value may be possibly modified during the Request step of the Validation Lifecycle: it could be 
filtered, assigned by default values and underlying data types could be coerced.

#### `.headers: any`
Original message may contain headers. Transport Router Adapter should extract headers data and set it as params. 
The responsibility for extracting request headers and setting it to the Service Request must lay on the 
Transport Router Adapter implementation.

#### `.params: any`
Original message may contain params.

Transport Router Adapter should extract request data and set it as params.

Notice that `.params` value may be possibly modified during the Request step of the Validation Lifecycle: it could be 
filtered, assigned by default values and underlying data types could be coerced.

#### `.transportRequest?: any`
Third-party request instance.

May be set by Transport Router Adapter.

#### `.log?: { trace(...args: any[]): void; debug(...args: any[]): void; info(...args: any[]): void; warn(...args: any[]): void; error(...args: any[]): void; fatal(...args: any[]): void; }`
Router must set Log child instance with a unique Request identifier.

#### `.socket?: NodeJS.EventEmitter`
In order to provide web sockets protocol support we need to operate on socket instance... But could we live without it?
Can we manage it through service request extensions mechanism?

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

#### `.[kReplyHeaders]: Map<string,string|string[]>`
Reply message headers container. Could be set anywhere during the Request Lifecycle with. Should be used to collect and 
deliver headers to original reply message. 

### Methods

#### `.setReplyHeader(title: string, value: number|string|array<string>): void`
Sets reply header to the map.

Must normalizes title.
Must validate and cast value.

Headers considerations:
- HTTP: When value is array, joins values by semicolon
- HTTP: *`Set-Cookie` must not be joined.* https://tools.ietf.org/html/rfc7230#section-3.2.2 (Hapi handles it correctly,
but we do not proxy set header calls, we collect them, that's why we allow raw array of strings as a value)
- HTTP: Should allow both 'x-' prefixed and not prefixed headers

Questions:
- AMQP: Reject headers starting with anything except 'x-' not let it to be overriden? What about `x-death`?
- Internal: Is there any sense of implementing headers for internal transport?

Usage:
```js
function actionHandler(serviceRequest) {
  const { state } = this.config.cookie
  serviceRequest.setReplyHeader('x-rate-limit', 10000)
  serviceRequest.setReplyHeader('set-cookie', [...state])
}
```
 
#### `.removeReplyHeader(title: string): void`
Normalizes title and removes header from headers map.

Usage:
```js
function actionHandler(serviceRequest) {
  serviceRequest.removeReplyHeader('x-rate-limit')
  serviceRequest.removeReplyHeader('set-cookie')
}
```

#### `.getReplyHeaders(): Map<string,number|string|string[]>`
Gets all previously initialized headers from headers map.

Usage:
```js
function actionHandler(serviceRequest) {
  serviceRequest.removeReplyHeader('x-rate-limit')
  serviceRequest.removeReplyHeader('set-cookie')
}
```

#### `.getReplyHeader(title: string): number|string|string[]`
Gets header from map.

Must normalize title.

## Implementation design
### AMQP Transport
Extract headers collection and set it under `kReplyHeaders` key of `raw.properties`, where `kReplyHeaders` is a Symbol 
defined by `@microfleet/transport-amqp` library.

### HTTP Transport
Consider HTTP RFC relative to [`set-cookie` header](https://tools.ietf.org/html/rfc7230#section-3.2.2). Since this is
common thing for any HTTP handler, it should be implemented in a composable way.

#### Hapi Handler
Extract headers collection and set it to the response using Hapi Response Toolkit. 

### SocketIO Transport
Expect new optional argument `options` to be passed on `.emit`:
```
.emit(action: string, body: any, options: SocketIOMessageOptions, callback: RequestCallback): void
```

When present, options may contain `simpleResponse` setting, which defaults to true.
When `simpleResponse` option is disabled, callback `result` must be resolved with `data` containing response message,
and `headers` containing headers that had user could set.  

```
{ headers: { [key: string]: string }, data?: unknown }
```

Usage
```
client.emit('echo', { message: 'ok' }, { simpleResponse: false }, (error, result) => {
  const { data, headers } = result;
});
```

### Internal Transport
If there any sense of implementing internal transport headers, its returning Promise may also be resolved with `data` 
and `headers`. However, I don't see the `dispatch` method argument list extended by some response options like 
`simpleResponse`, because it does not seem like an appropriate place for that.
