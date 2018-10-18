# [13.0.0](https://github.com/microfleet/core/compare/v12.0.1...v13.0.0) (2018-10-18)


### Bug Fixes

* binary, main export ([a0eb7ed](https://github.com/microfleet/core/commit/a0eb7ed))
* bug in the amqp routing ([72fd150](https://github.com/microfleet/core/commit/72fd150))
* expose more types ([bf645f6](https://github.com/microfleet/core/commit/bf645f6))
* single export file, changelog ([baeca33](https://github.com/microfleet/core/commit/baeca33))
* start create configuration interface ([3c3c383](https://github.com/microfleet/core/commit/3c3c383))


### Features

* reworked in typescript ([#289](https://github.com/microfleet/core/issues/289)) ([3b92426](https://github.com/microfleet/core/commit/3b92426))


### BREAKING CHANGES

* restructured this to be a monorepo in an effort to separate all of the bundled plugins later on. For now all releases will be published under `@next` tag. Uses experimental semantic-release-monorepo to support independent versioning. Removed express & restify support from http adapters
