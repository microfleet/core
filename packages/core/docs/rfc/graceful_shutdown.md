# Graceful shutdown

## Overview and Motivation
When shutdown sequence of `Mfleet` based Microservice is initiated, it drops any incoming requests and closes connections.
For overall stability and proper request handling, the Service must finish request processing and then initiate a shutdown procedure.

### Service shutdown
When the Service receives `SIGTERM` or `SIGINT` the shutdown procedure is initiated.

Service iterates over registered `close` methods, which are defined by transports or any plugins and executes them.

### Transport Plugins `close` method update
When this method executed, each plugin will perform its graceful or general shutdown procedure with some common logic:
* `AMQP` plugin closes `consumers` and leaves connection active.
* `Hapi` plugin checks if `SocketIO` attached and waits for `SocketIO` requests, then calls `HAPI.stop` and waits for own requests finish.

When `plugin:drain:${transport}` event received or transport has no active requests this method finishes, and service continues the shutdown process.

### Transport Connection count
Tracking connection count is possible only in HTTP and SocketIO transport by handling 'connect/disconnect' events. 
In AMQP transport this option is not available.
And almost all transports provide long polling or other long-running connections.
So for graceful shutdown, we should not lean on this feature and this feature will not guarantee that we can shutdown 
our service on time.

### Router Request Count Object `requestCountTracker`
Object used for handling request count for each transport. Also this object utilises `drain` events emitting logic.

#### Static Methods:
Sometimes `router` plugin is not enabled in service, these methods checking whether the plugin is enabled and perform execution of tracker instance methods.

  - **waitForRequestsToFinish(service, transport)** - Waits requests for specified transport.
  - **getRequestCount(service, transport)** - Gets request count for specified transport.
#### Instance Methods:
- **increase(transport: string)** - Increases `transport` request count.
- **decrease(transport: string)** - Decreases `transport` request count and emits `plugin:drain:${transport}`
    event when `service.stopping` flag set to `true` and `requestCount` is 0. 
- **waitForRequestsToFinish(transport: string)** - Waits for `drain` event and returns promise.



### Transport Request count
In the current architecture, transport plugins don't have any instance and perform like independent singletons.
Each transport that is able to receive incoming requests has `router` enabled by default.

Each `transport` binds its own event listeners to its internal modules or router adapters and perform request tracking and waiting using [RequestCountTracker](#router-request-count-object-requestcounttracker).     
**HTTP Transport**

Incoming requests are being handled by the `onRequest` extension for the `HAPI` server.
Responses are being tracked by the `response` event. The extension is used because `HAPI` server not emitting `request` event(event it's described in docs).

**SocketIO Transport**

We handle `onMessage` event to track incoming requests. 
Response tracking uses wrapper around `IOSocketMessage.callback` function.

**AMQP Transport**

Incoming requests are being tracked using `getAMQPRouterAdapter`.
Response tracking uses wrapper around `dispatch` function.
    

### Plugin connection count report
Each transport which supports request count tracking will export `getRequestCount()` method.

**TODO:**
* [x] Decide which way should be used?
* [x] Doc update.
* [x] Code.
* [x] Tests.

