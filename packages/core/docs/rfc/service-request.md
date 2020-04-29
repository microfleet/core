# Service Request
   
## Overview and Motivation
The Service handles incoming messages via several action Transports. On each incoming message Transport Router Adapter 
builds an object with `ServiceRequest` type and passes it to the Dispatcher. There is no common constructor function now. 
This object becomes available in the Action Handler as an argument. Its structure is abstract and functionality is 
basically transport-agnostic.


Most transport protocols natively have headers in messages. While currently every Transport Router Adapter is able to 
parse incoming messages including its optional headers, in order to fully support messaging protocols the Service should 
provide a way to set, modify and remove response message headers. That's why we need to implement **common reply headers 
API**.


Considering Node V8 hidden classes concept, to minimize hidden class trees number and respectfully maximize the 
performance, the Service Request instance must always aim to have same object shape and its properties initialization 
order. In order to make it even more performant we have to choose functions over ES6 classes for the Service Request 
implementation. Due to that we need to use **single constructor function** to instantiate Service Request objects 
anywhere.


Developer experience could be improved in two ways: early headers validation and **strict and common validation policy**. 
Early validation will help a developer to avoid errors on transport level. Since the limitations may be different, we 
must comply with the strictest among all transports validation rules, so that any Action Handler could start to support 
each of the Transports effortlessly.


In order to respect backwards compatibility, we should be able to choose whether the reply will contain **only 
message body or include headers** as well. This will be resolved with boolean **simpleResponse** option on the Transport
Plugin level, which value must be `true` by default.

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

#### `.[kReplyHeaders]: Map<string,string|string[]>`
Reply message headers container. Could be set anywhere during the Request Lifecycle with. Should be used to collect and 
deliver headers to original reply message. 

### Methods

#### `.setReplyHeader(title: string, value: number|string|array<string>): void`
Sets reply header to the map.

Must normalize title.
Must cast numeric value to string.
Must validate title and value. Must throw exception if any of arguments is invalid.

If normalized `title` is `set-cookie`, it's being appended to previously set `set-cookie` value.
Else it`s value is being overridden:

```js
function actionHandler(serviceRequest) {
  serviceRequest.setReplyHeader('x-rate-limit', 10000)
  serviceRequest.setReplyHeader('x-rate-limit', 20000)
  
  serviceRequest.setReplyHeader('set-cookie', 'state=sg687gjjsdg69847gjsh; Domain=app.com; Secure; HttpOnly')
  serviceRequest.setReplyHeader('set-cookie', 'visitor=798; Domain=app.com; Secure; SameSite=Lax')
  
  serviceRequest.setReplyHeader('x-location', 'lat=58.259624, lng=55.919243')
  serviceRequest.setReplyHeader('X-LOCATION', 'lat=64.547589, lng=39.758303')
}
```

This will make the reply headers map be like:
```
Map {
  'set-cookie' => [
    'state=sg687gjjsdg69847gjsh; Domain=app.com; Secure; HttpOnly',
    'visitor=798; Domain=app.com; Secure; SameSite=Lax'
  ],
  'x-rate-limit' => '20000',
  'x-location' => 'lat=64.547589, lng=39.758303',
}
```
Which will result in two different header lines for HTTP transport.
 
#### `.removeReplyHeader(title: string): void`
Normalizes title and removes header from headers map.

Usage:
```js
function actionHandler(serviceRequest) {
  serviceRequest.removeReplyHeader('x-rate-limit')
  serviceRequest.removeReplyHeader('set-cookie')
}
```

#### `.getReplyHeaders(): Map<string,string|string[]>`
Gets all previously initialized headers from headers map.

Usage:
```js
function actionHandler(serviceRequest) {
  serviceRequest.removeReplyHeader('x-rate-limit')
  serviceRequest.removeReplyHeader('set-cookie')
}
```

#### `.getReplyHeader(title: string): string|string[]`
Gets header from map.

Must normalize title.

### `.isValidReplyHeader(title: string, value: string|string[]): boolean`
Must validate title and value.
Validation rules are:
* Is ASCII
Empty strings are allowed.

## Implementation design

### AMQP Transport
Extract headers collection and set it under `kReplyHeaders` key of `raw.properties`, where `kReplyHeaders` is a Symbol 
defined by `@microfleet/transport-amqp` library.

### HTTP Transport
Consider HTTP RFC relative to [`set-cookie` header](https://tools.ietf.org/html/rfc7230#section-3.2.2).

#### Hapi Handler
Extract headers collection and set it to the response using Hapi Response Toolkit. 

### SocketIO Transport
Expect new optional argument `options` to be passed on `.emit`:
```
.emit(action: string, body: any, options: SocketIOMessageOptions, callback: RequestCallback): void
```

When present, options may contain `simpleResponse` setting.
When `simpleResponse` option is disabled, callback `result` must be resolved with `data` containing reply message,
and `headers` containing headers.  

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
Router plugin exposes two `dispatch` methods to the Service: `.dispatch()` and `.router.dispatch()`.
Extend Router plugin `.dispatch` method signature with optional `options` argument to pass `simpleResponse` flag.
