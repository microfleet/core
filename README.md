# @microfleet / core

## Opinionated Web and (Micro)Services Toolkit

Lead Maintainer: [Vitaly Aminev](https://github.com/avvs)

Easily design, develop & distribute your code with opinionated microservices toolkit.
It's designed to provide highly extensible, defined structure so that you only have to worry about implementing business logic and nothing else.
Make sure that every minute you spend counts.

## Installation

[![Build Status](https://semaphoreci.com/api/v1/microfleet/core/branches/master/shields_badge.svg)](https://semaphoreci.com/microfleet/core)
[![Code Climate](https://codeclimate.com/github/microfleet/core/badges/gpa.svg)](https://codeclimate.com/github/microfleet/core)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

`yarn add @microfleet/core` or `npm i @microfleet/core`

## Getting started

### What is @microfleet?

First of all it's a middle ground between usability and flexibility, ease of use and scalability. Unless you are Facebook or Google it's very likely that you can handle hundreds of thousands of TPS on a bunch of small and slow VMs with @microfleet. It's not a walk in the park, but after grasping basic concepts of this - you'd be able to create robust microservices within minutes.

A lot of components could still be improved and a lot of common use-cases handled, we've been working on this since 2015 and we are commited to constantly improving this toolkit as we believe that almost every app out there shares common functionality. We want to make a toolkit that allows you to hack together production grade apps within days to be able to prove your startup concept, roll out safely and actually handle load if your idea is the next Big One.

Having this concept in mind there is already a solid basis for this:

* [@microfleet/users](https://github.com/makeomatic/ms-users) - user management service with practically anything you might think of in that matter
* [@microfleet/files](https://github.com/makeomatic/ms-files) - distributed file management with the help of S3-like storage
* [@microfleet/payments](https://github.com/makeomatic/ms-payments) - loathed paypal payments implementation. This one likely needs a lot of love, even though it's still used in production
* [@microfleet/chat](https://github.com/makeomatic/mservice-chat) - chat service, real-time and scalable with moderator capabilities. Once again a middle ground between complicated messenger apps and hello-world chats
* [@microfleet/mailer](https://github.com/makeomatic/ms-mailer) - sends emails, what else! includes queue, quality of service & integrations with some of the popular providers
* [@microfleet/phone](https://github.com/makeomatic/ms-phone) - if mails aren't good enough you can always send a text message
* [@microfleet/social](https://github.com/makeomatic/mservice-social) - hub for social services
* [@microfleet/calendar](https://github.com/makeomatic/mservice-calendar) - be able to create calendar of events for your app, radio station or anything else
* [@microfleet/organizations](https://github.com/makeomatic/ms-organizations) - this one is WIP, provides meta layer to include shared-accounts / organization-like accounts

Most of the time it's easy to combine these services in a lego-like fashion providing you with a mix of desired functionality.

### Using @microfleet

So, how do we use it? After many iterations we have what we believe is a great structure for the code, which allows for easy service creation.
Here is an example of action:

```src/actions/add.js
function addAction({ params }) {
  return params[0] + params[1];
}

module.exports = addAction;
```

How do we test it? Easiest for us is https://github.com/jakubroztocil/httpie, go ahead and install it if you still haven't

It's clear that params could be anything and our little action handler won't do any good in that way as we have no means of enforcing validation of input arguments. Rejoice, this was one of the first things we've done. By default every handler will look for a relevant `json-schema` under `<project_root>/schemas/<actionName>.json`. Lets create that file now with the following content:

```schemas/add.json
{
  "$id": "add",
  "type": "array",
  "items": {
    "minItems": 2,
    "maxItems": 2,
    "type": "number"
  }
}
```

It will ensure that payload is validated, it must be an array and contain 2 numbers. You get the gist of it.
Let's try running request without any payload:

```sh
http localhost:3000/mservice/add

HTTP/1.1 400 Bad Request
Connection: keep-alive
Date: Mon, 22 May 2017 21:11:32 GMT
Transfer-Encoding: chunked
cache-control: no-cache
content-encoding: gzip
content-type: application/json; charset=utf-8
vary: accept-encoding

{
    "error": "Bad Request",
    "message": "add validation failed: data should be array",
    "name": "ValidationError",
    "statusCode": 400
}
```

And with the correct payload:

```sh
echo '[1,2]' | http POST localhost:3000/mservice/add
HTTP/1.1 200 OK
Connection: keep-alive
Date: Mon, 22 May 2017 21:21:33 GMT
Transfer-Encoding: chunked
cache-control: no-cache
content-encoding: gzip
content-type: application/json; charset=utf-8
vary: accept-encoding

3
```

Now on top of it you can build pretty much anything - routes will be created automatically, network topology will follow your configuration, input would be validated. Make sure to check real-world examples with or without database usage. We recommend starting with the [@microfleet/mailer](https://github.com/makeomatic/ms-mailer) service as it contains only 2 actions, but clearly shows most of the concepts.

## Available Plugins

To ensure smooth and fast development, there are many core plugins that build-up on core functionality. At this point they are all bundled with
core toolkit, but expect them to be externalized as toolkit matures.

### Essentials

This includes common functionality plugins:

* [validator](src/plugins/validator.js) - json-schema based input data validation
* [logger](src/plugins/logger.js) - request logger
* [router](src/plugins/router.js) - logic layer for multi-transport router

#### Validator

Based on [ms-validation](https://github.com/makeomatic/ms-validation) allows to easily validate input args based on json-schema.
Create directory `schemas` and populate it with schemas, where names correspond to actions.

Adds following API to the microservice instance:

* `.validator` - instance of `ms-validation`
* `.validate<T>(schema: string, input: T) => Promise<Error | T>` - Promise-based API that resolves/rejects based
* `.validateSync<T>(schema: string, input: T) => { error?: Error, doc: T }` - sync API, which always returns an object. If validation failed - it populates error property with an instance of Error. Doc is a modified version of input arg with coercion, defaults, filtering of props and so on.

#### Logger

Creates bunyan logger, with streams based on passed configuration and extends microservice instance with the following methods:

* `.log` - instance of [bunyan](https://github.com/trentm/node-bunyan) logger

#### Router

Initializes router, which scans folders for actions and builds routing tree for for enabled transports.
Router controls request lifecycle, which tries to mimic hapi.js lifecycle as closely as possible, with unified interface for multiple transports.
Currently supports `AMQP` (`ms-amqp-transport`), `HTTP` (`hapi.js`, `express.js,` `restify`) and `Socket.IO`.
Default sensible configurations are provided.

Stock configuration looks for all `**/*.js` files in `src/actions` directory, enables `hapi.js` based HTTP handler on port 3000.
On top of it enables 2 router extension, which provide request logging & automatic json-schema matching for actions based on their names.

##### Request Lifecycle

We've struggled to make sure that requests loop the same regardless of transport selected and the lifecycle was adopted from hapi.js model as it proved to be extremely easy to follow and extend.

[Lifecycle](src/plugins/router/dispatcher.js) goes in the following way:

0. [Request](src/plugins/router/modules/request.js) - finds `action` based on `route` and `ServiceRequest` object
  * preRequest: `(route: string, request: ServiceRequest) => mixed`
  * request: adds `action` and `route` to `ServiceRequest` object
  * postRequest: can handle errors from `request` part
0. [Auth](src/plugins/router/modules/auth.js) - performs authentication if `action.auth` is present
  * preAuth - `(request: ServiceRequest) => mixed`
  * auth: performs authentication
  * postAuth: can handle errors from `auth` part
0. [Validate](src/plugins/router/modules/validate.js) - performs validation based on `json-schema` if `action.schema` is defined
  * preValidate: `(request: ServiceRequest) => mixed`
  * validate: performs validation
  * postValidate: handle validation errors if handlers present
0. [Allowed](src/plugins/router/modules/allowed.js) - performs arbitrary validation before passing control to actual function handler
  * preAllowed: `(request: ServiceRequest) => mixed`
  * allowed: performs arbitrary code defined in `action.allowed`
  * postAllowed: handle errors from `allowed` part
0. [Handler](src/plugins/router/modules/handler.js) - runs userland endpoint code:
  * preHandler: `(request: ServiceRequest) => mixed`
  * handler: performs userland code
  * postHandler: handle response from `handler`
9. [Response](src/plugins/router/modules/response.js) - runs response handler, which makes standard error / standard responses:
  * preResponse: `(error: ?Error, result: ?Mixed, request: ServiceRequest) => mixed`
  * response: pushes data to the requester
  * postResponse: can modify finalized data that goes to the client

### Transports

* [amqp](src/plugins/amqp.js) - AMQP transport based on [ms-amqp-transport](https://github.com/ms-amqp-transport), requires RabbitMQ
* [http](src/plugins/http.js):
  * [hapi.js](src/plugins/http/handlers/hapi) - hapi implementation, recommended for use
  * [express.js](src/plugins/http/handlers/express) - express.js implementation
  * [restify](src/plugins/http/handlers/restify) - restify implementation
* [socket.io](src/plugins/socketIO.js) - enabled websockets on top of http, therefore, requires `http plugin` to be enabled

### Databases

* [redis cluster](src/plugins/redisCluster.js) - clustered redis implementation, uses [ioredis](https://github.com/luin/ioredis) client
* [redis sentinel](src/plugins/redisSentinel.js) - HA redis implementation, no sharding, uses [ioredis](https://github.com/luin/ioredis) client
* [knex](src/plugins/knex.js) - high-level API for SQL based databases (PostgreSQL, MySQL, MariaDB, etc)
* [elasticsearch](src/plugins/elasticsearch.js) - elasticsearch connector
* [cassandra](src/plugins/cassandra.js) - cassandra connector

## Roadmap

As with any healthy toolkit - there is always plenty to add. These are some of the major features that we are working towards.
Our goal to ensure that most of the apps can be created by writing a simple integration layer with your business logic and a bunch
of human-readable configuration

- [ ] more docs
  - [ ] verbose validator configuration example
  - [ ] verbose logger configuration example
  - [ ] verbose router configuration example
  - [ ] verbose AMQP transport configuration docs
  - [ ] verbose HTTP transports configuration example
  - [ ] verbose socket.io transport configuration example
  - [ ] redis documentation
  - [ ] knex documentation
  - [ ] elasticsearch configuration documentation
  - [ ] cassandra configuration docs

- [ ] authentication framework:
  - [ ] ubiquitous way to pass authorization tokens disregarding the transport
  - [ ] RBAC route configuration

- [ ] transport-agnostic inter-service communication API
  - [ ] service discovery integration:
    - [ ] consul
    - [ ] etcd
  - [ ] high level messaging API
  - [ ] app-level healthchecks

- [ ] Tracing API: visibility into transactions
  - [ ] tracing integration via http://opentracing.io/
  - [ ] Monitoring dashboard

## Sponsorship

Development of the @microfleet generously supported by contributions from individuals and corporations. If you are benefiting from @microfleet and would like to help keep the project financially sustainable, please send an email to [Vitaly Aminev](mailto:v@makeomatic.ca)

### Current Supporters

* [Makeomatic](https://makeomatic.ca)
