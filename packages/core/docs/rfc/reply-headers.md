# Reply Headers



## Overview and Motivation
Most transport protocols natively have headers in messages. While currently every Transport Router Adapter is able to
parse incoming messages including its optional headers, in order to fully support messaging protocols the Service SHOULD
provide a way to set, modify and remove **response** message headers. 

## Requirements
* User MUST be able to know whether the reply headers API is supported by current Service Request ActionTransport
* When reply headers API is available, User MUST be able to create, read, update and delete reply header by its name and value

## Recommendations
* When the Action Handler supports multiple ActionTransports, User SHOULD check whether current Service Request ActionTransport has reply headers API support
* User SHOULD be cautious when adding new ActionTransport to an existing ActionHandler in case new ActionTransport has no reply headers API support

## Characteristics and concerns
* The reply headers API SHOULD comply with such characteristics as performance, testability, scalability, evolvability, reusability and simplicity as it is the OSS framework core domain characteristics
* The request-response API for each transport MUST be backward compatible
* Reply headers MUST NOT collide with any other properties created in userland code
* Reply headers MUST be correctly passed for both successful and error responses

## Support
### `ActionTransport.http`
HTTP naturally supports headers. 

`ActionTransport.http` MUST support Reply Headers API.

### `ActionTransport.amqp`
AMQP allows extending message properties with any properties, AMQP-Transport implements message extension API which allows setting reply headers.
`ActionTransport.amqp` has **request** headers support, so it seems right to pair it with **reply** headers.

`ActionTransport.amqp` MUST support Reply Headers API.

### `ActionTransport.socketio`
Technically SocketIO allows listening to Engine.IO events and [modifying response *HTTP* headers](https://socket.io/blog/socket-io-4-1-0/#add-a-way-to-customize-the-response-headers).
However, SocketIO ServiceRequest request and response context is limited to particular event frame. Frame headers are not intended to pass any kind of application data.

`ActionTransport.socketio` MUST NOT support Reply Headers API.

See [alternatives](#actiontransportsocketio-1) that have been considered.

`ActionTransport.socketio` MUST NOT support Reply Headers API.

### `ActionTransport.internal` 
The idea of the Microfleet Internal Transport is to reduce network usage by calling action internally. 
In practice, it goes along with `ActionTransport.amqp` and sometimes `ActionTransport.http` Transport support very often.

Internal Transport response does not have any predefined structure and technical limitations.

Internal transport has no concept of **reply** headers and no other architectural need of having these than supporting the reply headers API: payload/meta structure could have been implemented inside the returning value. 
Internal transport has no concept of **request** headers either.

The trade-off is about performance, usability, and simplicity:

Implemented support pros:
* provides simplicity in terms of action handler usability: for the actions that work with `ActionTransport.amqp` and/or `ActionTransport.http`, `ActionTransport.internal` support could be enabled effortlessly 

Implemented support cons:
* increases coupling: in order to know whether to return headers or not - the caller context SHOULD be aware of dispatch internals
* increases complexity: to comply the backward compatibility we have to introduce new concept of dispatch options with some default behavior that tells dispatcher to respond with data only; provide Router configuration options to preset defaults for every dispatch for better developer experience
* increases complexity: introduces concept of headers that are not really headers by [definition](https://en.wikipedia.org/wiki/Header_(computing)) - just another property of a response object, which is semantically incorrect 
* decreases performance: each request that goes through router has to resolve dispatch options and returning value format 

No support pros:
* nothing changes

No support cons:
* decreases simplicity: in order to support multiple types of transport - both `ActionTransport.internal` and any other that have reply headers support - user land code will have to change current action handler and probably provide

## Headers 
Setting headers
  * Generally, header value SHOULD be a string
    * http: exception, HTTP supports any number of set-cookie response headers, for this case User MUST be able to set array value
    * For any other
  * Generally, setting the same header value twice will override the value.
    * http: exception, HTTP supports any number of set  
Array value makes sense and is allowed only as an exception for the HTTP `set-cookie` header.
When you set the value more than once, it gets overriden, except for the `set-cookie` header.
  * http: set-cookie is appended, not merged

## Headers validation
Early validation may help to avoid errors on transport level. It could make sure to provide acceptable string by the Transport, and nothing specific like every header value semantic validation.
The tradeoff here is about whether perform validation at all or not, and what part of the system SHOULD be responsible for it.

### Requirements
Validation requirements are:
* Originally, constraints are different for each Transport
  * HTTP response headers: US-ASCII
    * "Newly defined header fields SHOULD limit their field values to US-ASCII octets", - [RFC7230](https://www.rfc-editor.org/rfc/rfc7230#section-3.2.4)
    * Set-Cookie header might have multiple values
    * Empty strings are allowed
  * AMQP message properties: Unicode, UTF-8
    * Reply headers are passed through message properties, broker passes it as binary data and does not restrict its content
    * AMQP 0-9-1 spec does not specify character set for the message and [message properties](https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf)
    * RabbitMQ does not specify character set for [message properties](https://www.rabbitmq.com/docs/publishers#message-properties)
    * AMQP coffee lib converts message to bytes with `utf8` encoding before publishing it to the queue
    * AMQP coffee lib parses bytes as a `utf8` string when retrieving a message from the queue
    * Header value could only be a string
    * Empty strings are allowed
* Websocket frames do not use headers for application data
* Internal transport do not have headers
* If any transport gets added the validation will probably be quite simple

### Validation responsibility
What part of system has to be responsible for reply headers validation?
* Service Request class validates itself
* Router Adapter / Router validates Service Request before send
* Userland code

For now, reply headers validation does not require any external context. Requirements are pretty common and breaking them does not break the code.
As long as it does not, the Service Request MUST be responsible for the data to be logically consistent for the implementation, i.e. data type, but no more than that.
In the future, if we need to make use of external context like AJV validation schemas for some new Transport Service Request, reply headers must be validated on the router adapter level.

### Validation rules
Validation could be required in two ways:
* common validation rules: strictest validation rules of all Transports
* own validation rules: each ActionTransport will have its own validation rules

Common validation rules pros:
* Provides simplicity in terms of adding enabling new Transport support for the action handler: if the value sent is valid for one of Transports, it is valid for any of them, and you could enable it at any point

Common validation rules cons:
* Violates evolvability and backward compatibility: impossible to add modify validation rules, if any new Transport is added
* Makes ServiceRequest too thick does not really improve developer experience, the main reason why we validate headers at all
* The strictest validation rules make values that are perfectly valid on the underlying transport level invalid

Own validation rules pros:
* Thin validation, rules always comply with Transport specs
* Less coupling between plugins

Own validation rules cons:
Can not think of any.

## Setting error reply headers
User SHOULD be able to pass **error** reply headers. Microfleet Service Request SHOULD provide symmetrical functionality as in a happy request-response path.
Headers that were set before error was thrown MUST NOT be passed further.

Service Request `.error` property is responsible for providing necessary error context. Currently, it passes only data. 
But this object could also be used to pass error headers. Each Transport Router Adapter MUST pass error headers responsibly.

## Service Request
Service Request has to be extended with following properties and methods.

### Properties
#### New property `.[kReplyHeaders]: Map<string,string|string[]>`
Reply message headers container. Could be set anywhere during the Request Lifecycle. SHOULD be used to collect and
deliver headers to original reply message.

#### Modify property `.error` type
Request error. Error MUST be able to store reply headers.

### Methods
#### New method `.hasReplyHeadersSupport(): boolean`
MUST return `true` if the ServiceRequest `ActionTransport` supports reply headers and all reply headers API

#### New method `.setReplyHeader(title: string, value: number|string|array<string>): ServiceRequest`
Sets reply header to the map.

MUST normalize title.
MUST cast numeric value to string.
MUST validate title and value. MUST throw exception if any of arguments is invalid.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

#### New method `.getReplyHeader(title: string): string|string[]`
MUST normalize title.
MUST return header value from headers container.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

#### New method  `.removeReplyHeader(title: string): ServiceRequest`
MUST normalize title and remove header from headers container.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

#### New method `.getReplyHeaders(): Map<string,string|string[]>`
MUST return all headers from headers container.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

#### New method `.clearReplyHeaders(): ServiceRequest`
MUST clear all headers in the headers container.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

### New method `.isValidReplyHeader(title: string, value: string|string[]): boolean`
MUST validate title and value.

MUST throw an Error if the ServiceRequest `ActionTransport` does not support reply headers and all reply headers API

## Alternatives
Support and validation trade-offs are mostly about what is questionably good once in rare cases of userland code VS what is strategically good for the framework.

### Support
#### `ActionTransport.socketio`
There is a way to pass the headers as a part of structured payload and enable this optional response structure passing dispatch options, which default to `{ "simpleResponse": true }`.

### Validation
We could comply with the strictest among all transports validation rules, so that any Action Handler could start to support each of the Transports effortlessly. The team considered this as an option at first.
