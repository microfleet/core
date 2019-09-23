# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [14.0.8](https://github.com/microfleet/core/compare/@microfleet/core@14.0.7...@microfleet/core@14.0.8) (2019-09-23)

**Note:** Version bump only for package @microfleet/core





## [14.0.7](https://github.com/microfleet/core/compare/@microfleet/core@14.0.6...@microfleet/core@14.0.7) (2019-09-19)

**Note:** Version bump only for package @microfleet/core





## [14.0.6](https://github.com/microfleet/core/compare/@microfleet/core@14.0.5...@microfleet/core@14.0.6) (2019-09-18)

**Note:** Version bump only for package @microfleet/core





## [14.0.5](https://github.com/microfleet/core/compare/@microfleet/core@14.0.4...@microfleet/core@14.0.5) (2019-09-16)


### Bug Fixes

* define action route in validateAction ValidationError ([#332](https://github.com/microfleet/core/issues/332)) ([ea63995](https://github.com/microfleet/core/commit/ea63995))





## [14.0.4](https://github.com/microfleet/core/compare/@microfleet/core@14.0.3...@microfleet/core@14.0.4) (2019-09-11)


### Bug Fixes

* upgrade deps ([e3ee731](https://github.com/microfleet/core/commit/e3ee731))





## [14.0.3](https://github.com/microfleet/core/compare/@microfleet/core@14.0.2...@microfleet/core@14.0.3) (2019-08-30)


### Bug Fixes

* update dependencies ([984135a](https://github.com/microfleet/core/commit/984135a))
* **http:** set default handler to hapi ([#330](https://github.com/microfleet/core/issues/330)) ([b83b4bd](https://github.com/microfleet/core/commit/b83b4bd))





## [14.0.2](https://github.com/microfleet/core/compare/@microfleet/core@14.0.1...@microfleet/core@14.0.2) (2019-08-22)


### Bug Fixes

* clone params on dispatch ([10e56a2](https://github.com/microfleet/core/commit/10e56a2))
* **dispatch:** work with nil-like dispatch ([af39b54](https://github.com/microfleet/core/commit/af39b54))





## [14.0.1](https://github.com/microfleet/core/compare/@microfleet/core@14.0.0...@microfleet/core@14.0.1) (2019-07-30)

**Note:** Version bump only for package @microfleet/core





# [14.0.0](https://github.com/microfleet/core/compare/@microfleet/core@13.9.1...@microfleet/core@14.0.0) (2019-06-26)


### Features

* upgrade hapi to @hapi/hapi ([29ed9e3](https://github.com/microfleet/core/commit/29ed9e3))


### BREAKING CHANGES

* uses @hapi/hapi, @hapi/joi, etc





## [13.9.1](https://github.com/microfleet/core/compare/@microfleet/core@13.9.0...@microfleet/core@13.9.1) (2019-06-13)


### Bug Fixes

* correct release publisher ([e90cb12](https://github.com/microfleet/core/commit/e90cb12))





# [13.9.0](https://github.com/microfleet/core/compare/@microfleet/core@13.8.1...@microfleet/core@13.9.0) (2019-06-13)


### Bug Fixes

* fix lint errors ([50b599f](https://github.com/microfleet/core/commit/50b599f))
* update sentry logger tests ([50f1ce2](https://github.com/microfleet/core/commit/50f1ce2))


### Features

* add tests ([0326a74](https://github.com/microfleet/core/commit/0326a74))
* update minor dependencies ([2e7dda4](https://github.com/microfleet/core/commit/2e7dda4))





## 13.8.1 (2019-04-08)


### Bug Fixes

* allow dispatch to pass auth obj ([a1bea26](https://github.com/microfleet/core/commit/a1bea26))
* attaching extra data to error ([d43844e](https://github.com/microfleet/core/commit/d43844e))
* binary, main export ([a0eb7ed](https://github.com/microfleet/core/commit/a0eb7ed))
* bug in the amqp routing ([72fd150](https://github.com/microfleet/core/commit/72fd150))
* correct stacktrace order ([b1819f1](https://github.com/microfleet/core/commit/b1819f1))
* crash on sentry logger ([e62c361](https://github.com/microfleet/core/commit/e62c361))
* crash when sending sentry logs ([b918f38](https://github.com/microfleet/core/commit/b918f38))
* ensure bluebird gets its own copy with cancellation active ([0f246df](https://github.com/microfleet/core/commit/0f246df))
* ensure knex retries the connection several times ([fc3af6a](https://github.com/microfleet/core/commit/fc3af6a))
* enums in export declarations not preserved ([51d7110](https://github.com/microfleet/core/commit/51d7110))
* expose more types ([bf645f6](https://github.com/microfleet/core/commit/bf645f6))
* improve audit logger ([5189838](https://github.com/microfleet/core/commit/5189838))
* linter notice ([e157a82](https://github.com/microfleet/core/commit/e157a82))
* logging to sentry ([7e94a12](https://github.com/microfleet/core/commit/7e94a12))
* re-release ([3449ff4](https://github.com/microfleet/core/commit/3449ff4))
* redisCluster endless connect ([de169d1](https://github.com/microfleet/core/commit/de169d1))
* redisSentinel schema, more types ([62d1556](https://github.com/microfleet/core/commit/62d1556))
* release bugs due to deploy overrides ([f7cc63d](https://github.com/microfleet/core/commit/f7cc63d))
* rework and use raw logging of sentry ([a5bec0f](https://github.com/microfleet/core/commit/a5bec0f))
* sentry timestamp value ([6a11b91](https://github.com/microfleet/core/commit/6a11b91))
* service.dispatch types ([4ca8235](https://github.com/microfleet/core/commit/4ca8235))
* single export file, changelog ([baeca33](https://github.com/microfleet/core/commit/baeca33))
* stacktrace extraction ([6285d12](https://github.com/microfleet/core/commit/6285d12))
* start create configuration interface ([3c3c383](https://github.com/microfleet/core/commit/3c3c383))
* ts opts ([e0d92aa](https://github.com/microfleet/core/commit/e0d92aa))
* update all deps ([ebc6661](https://github.com/microfleet/core/commit/ebc6661))
* update lock file ([706dc17](https://github.com/microfleet/core/commit/706dc17))


### Features

* **log:** change library for setry (raven to sentry node) ([#291](https://github.com/microfleet/core/issues/291)) ([67345fe](https://github.com/microfleet/core/commit/67345fe))
* **router:** options for disable some errors for audit log ([#297](https://github.com/microfleet/core/issues/297)) ([da43919](https://github.com/microfleet/core/commit/da43919))
* log pretty ([#311](https://github.com/microfleet/core/issues/311)) ([4fc3715](https://github.com/microfleet/core/commit/4fc3715))
* maintenance mode ([#310](https://github.com/microfleet/core/issues/310)) ([1212b61](https://github.com/microfleet/core/commit/1212b61))
* more ts types, upgrade all deps ([#290](https://github.com/microfleet/core/issues/290)) ([64a3aba](https://github.com/microfleet/core/commit/64a3aba))
* prometheus ([#303](https://github.com/microfleet/core/issues/303)) ([698fe21](https://github.com/microfleet/core/commit/698fe21))
* rework logger ([4e870fd](https://github.com/microfleet/core/commit/4e870fd))
* reworked in typescript ([#289](https://github.com/microfleet/core/issues/289)) ([3b92426](https://github.com/microfleet/core/commit/3b92426))
* run all hooks of pipeline, regardless of action ([87cc941](https://github.com/microfleet/core/commit/87cc941))


### BREAKING CHANGES

* restructured this to be a monorepo in an effort to separate all of the bundled plugins later on. For now all releases will be published under `@next` tag. Uses experimental semantic-release-monorepo to support independent versioning. Removed express & restify support from http adapters
