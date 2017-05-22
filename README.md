# @microfleet / core

[![Greenkeeper badge](https://badges.greenkeeper.io/makeomatic/mservice.svg)](https://greenkeeper.io/)
[![Build Status](https://semaphoreci.com/api/v1/makeomatic/mservice/branches/master/shields_badge.svg)](https://semaphoreci.com/makeomatic/mservice)
[![Code Climate](https://codeclimate.com/github/makeomatic/mservice/badges/gpa.svg)](https://codeclimate.com/github/makeomatic/mservice)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Easily design, develop & distribute your code with opinionated microservices toolkit.
It's designed to provide highly extensible, defined structure so that you only have to worry about implementing business logic and nothing else.
Make sure that every minute you spend counts.

## Installation

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

To ensure smooth and fast development, there are many core plugins that allow

### Essentials

### Transports

### Databases

## Roadmap

As with any healthy toolkit - there is always plenty to add. These are some of the major features that we are working towards.
Our goal to ensure that most of the apps can be created by writing a simple integration layer with your business logic and a bunch
of human-readable configuration

- [] authentication framework:
  - [] ubiquitous way to pass authorization tokens disregarding the transport
  - [] RBAC route configuration

- [] transport-agnostic inter-service communication API
  - [] service discovery integration:
    - [] consul
    - [] etcd
  - [] high level messaging API
  - [] app-level healthchecks

- [] Tracing API: visibility into transactions
  - [] tracing integration via http://opentracing.io/
  - [] Monitoring dashboard
