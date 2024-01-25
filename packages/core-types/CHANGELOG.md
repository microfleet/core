

# [3.1.0](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.5...@microfleet/core-types@3.1.0) (2024-01-25)


### Features

* **plugin-logger:** sentry fingerprinting ([#697](https://github.com/microfleet/core/issues/697)) ([849c599](https://github.com/microfleet/core/commit/849c599730f0561f9bdd01dbec3f16deeb08eb51))

# [3.1.0](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.5...@microfleet/core-types@3.1.0) (2024-01-25)


### Features

* **plugin-logger:** sentry fingerprinting ([#697](https://github.com/microfleet/core/issues/697)) ([849c599](https://github.com/microfleet/core/commit/849c599730f0561f9bdd01dbec3f16deeb08eb51))

## [3.0.5](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.4...@microfleet/core-types@3.0.5) (2024-01-17)


### Bug Fixes

* don't use logger in the mfleet ([61fdffc](https://github.com/microfleet/core/commit/61fdffc15f91941d13340035f58a75119bc80670))

## [3.0.5](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.4...@microfleet/core-types@3.0.5) (2024-01-17)


### Bug Fixes

* don't use logger in the mfleet ([61fdffc](https://github.com/microfleet/core/commit/61fdffc15f91941d13340035f58a75119bc80670))

## [3.0.4](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.3...@microfleet/core-types@3.0.4) (2024-01-05)


### Bug Fixes

* auto-starting an instance in ESM ([157d2a5](https://github.com/microfleet/core/commit/157d2a5cb60f881467a62c3e6aab34c1018b333d))

## [3.0.4](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.3...@microfleet/core-types@3.0.4) (2024-01-05)


### Bug Fixes

* auto-starting an instance in ESM ([157d2a5](https://github.com/microfleet/core/commit/157d2a5cb60f881467a62c3e6aab34c1018b333d))

## [3.0.3](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.2...@microfleet/core-types@3.0.3) (2024-01-05)


### Bug Fixes

* ensure full paths are resolved for generic actions in ESM mode ([a02d85f](https://github.com/microfleet/core/commit/a02d85fe88b1874d8a02c35f8c2fa76ba400cee5))

## [3.0.3](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.2...@microfleet/core-types@3.0.3) (2024-01-05)


### Bug Fixes

* ensure full paths are resolved for generic actions in ESM mode ([a02d85f](https://github.com/microfleet/core/commit/a02d85fe88b1874d8a02c35f8c2fa76ba400cee5))

## [3.0.2](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.1...@microfleet/core-types@3.0.2) (2024-01-04)


### Bug Fixes

* dynamic import calls, swc -> esbuild ([7e6d1a2](https://github.com/microfleet/core/commit/7e6d1a29c92979626cab8ac96c9c55c02c19ab40))

## [3.0.2](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.1...@microfleet/core-types@3.0.2) (2024-01-04)


### Bug Fixes

* dynamic import calls, swc -> esbuild ([7e6d1a2](https://github.com/microfleet/core/commit/7e6d1a29c92979626cab8ac96c9c55c02c19ab40))

## [3.0.1](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.0...@microfleet/core-types@3.0.1) (2024-01-03)


### Bug Fixes

* wrong peer dep ([aeea4a0](https://github.com/microfleet/core/commit/aeea4a080492b24ca0ed544e3f791e3df9149209))

## [3.0.1](https://github.com/microfleet/core/compare/@microfleet/core-types@3.0.0...@microfleet/core-types@3.0.1) (2024-01-03)


### Bug Fixes

* wrong peer dep ([aeea4a0](https://github.com/microfleet/core/commit/aeea4a080492b24ca0ed544e3f791e3df9149209))

# [3.0.0](https://github.com/microfleet/core/compare/@microfleet/core-types@2.3.0...@microfleet/core-types@3.0.0) (2024-01-03)


### Features

* async plugin registration ([#694](https://github.com/microfleet/core/issues/694)) ([3b7969a](https://github.com/microfleet/core/commit/3b7969ae755862832889ae04fe4ef80e483b561d))


### BREAKING CHANGES

* requires oen to call await microfleet.register() before any of the plugins are instantiated. This allows one to have async jobs as part of the attachment routine. Updates @microfleet/validation to version 13, which moves from require() to async import() of files as part of this change. This raises min node.js version to 20.10 (it will still work on lower versions, but >= 20.10 allows for much better performance, as well as way fewer ESM issues). This will be a non-lts version aimed at polishing async plugins and tightening public interface

# [3.0.0](https://github.com/microfleet/core/compare/@microfleet/core-types@2.3.0...@microfleet/core-types@3.0.0) (2024-01-03)


### Features

* async plugin registration ([#694](https://github.com/microfleet/core/issues/694)) ([3b7969a](https://github.com/microfleet/core/commit/3b7969ae755862832889ae04fe4ef80e483b561d))


### BREAKING CHANGES

* requires oen to call await microfleet.register() before any of the plugins are instantiated. This allows one to have async jobs as part of the attachment routine. Updates @microfleet/validation to version 13, which moves from require() to async import() of files as part of this change. This raises min node.js version to 20.10 (it will still work on lower versions, but >= 20.10 allows for much better performance, as well as way fewer ESM issues). This will be a non-lts version aimed at polishing async plugins and tightening public interface

# [2.3.0](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.14...@microfleet/core-types@2.3.0) (2024-01-02)


### Features

* use dynamic import in readRoutes ([#686](https://github.com/microfleet/core/issues/686)) ([e62ce12](https://github.com/microfleet/core/commit/e62ce12d2b8449813977f345164fcc41b61aa748))

# [2.3.0](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.14...@microfleet/core-types@2.3.0) (2024-01-02)


### Features

* use dynamic import in readRoutes ([#686](https://github.com/microfleet/core/issues/686)) ([e62ce12](https://github.com/microfleet/core/commit/e62ce12d2b8449813977f345164fcc41b61aa748))

## [2.2.14](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.13...@microfleet/core-types@2.2.14) (2023-12-20)


### Bug Fixes

* @microfleet/validation v11.2.1 ([#683](https://github.com/microfleet/core/issues/683)) ([09339f0](https://github.com/microfleet/core/commit/09339f07ee876798076c56d0fc25c5b5435247c1))

## [2.2.14](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.13...@microfleet/core-types@2.2.14) (2023-12-20)


### Bug Fixes

* @microfleet/validation v11.2.1 ([#683](https://github.com/microfleet/core/issues/683)) ([09339f0](https://github.com/microfleet/core/commit/09339f07ee876798076c56d0fc25c5b5435247c1))

## [2.2.13](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.12...@microfleet/core-types@2.2.13) (2023-12-19)


### Bug Fixes

* update deps ([e6e043b](https://github.com/microfleet/core/commit/e6e043b1c4c59c4e39bcb6ed81f3e57c1434e19a))

## [2.2.13](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.12...@microfleet/core-types@2.2.13) (2023-12-19)


### Bug Fixes

* update deps ([e6e043b](https://github.com/microfleet/core/commit/e6e043b1c4c59c4e39bcb6ed81f3e57c1434e19a))

## [2.2.12](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.11...@microfleet/core-types@2.2.12) (2023-11-21)


### Bug Fixes

* kafka update ([a720d81](https://github.com/microfleet/core/commit/a720d8179aecb4a161b72eefbf2579252b56fcc0))

## [2.2.12](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.11...@microfleet/core-types@2.2.12) (2023-11-21)


### Bug Fixes

* kafka update ([a720d81](https://github.com/microfleet/core/commit/a720d8179aecb4a161b72eefbf2579252b56fcc0))

## [2.2.11](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.10...@microfleet/core-types@2.2.11) (2023-11-15)


### Bug Fixes

* upgrade dependencies ([3462882](https://github.com/microfleet/core/commit/3462882b1b6017f8e5072468f38e7fbd7903d044))
* upgrade deps, more granular log level control in logger plugin ([fa59e6f](https://github.com/microfleet/core/commit/fa59e6f6a8959b81bd38f5b2bdb12d335b6e5844))

## [2.2.11](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.10...@microfleet/core-types@2.2.11) (2023-11-15)


### Bug Fixes

* upgrade dependencies ([3462882](https://github.com/microfleet/core/commit/3462882b1b6017f8e5072468f38e7fbd7903d044))
* upgrade deps, more granular log level control in logger plugin ([fa59e6f](https://github.com/microfleet/core/commit/fa59e6f6a8959b81bd38f5b2bdb12d335b6e5844))

## [2.2.10](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.9...@microfleet/core-types@2.2.10) (2023-10-25)


### Bug Fixes

* upgrade deps, extras for sentry ([#674](https://github.com/microfleet/core/issues/674)) ([209eb8d](https://github.com/microfleet/core/commit/209eb8dd8b2ba086ebda004ead7b25739bade72f))

## [2.2.10](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.9...@microfleet/core-types@2.2.10) (2023-10-25)


### Bug Fixes

* upgrade deps, extras for sentry ([#674](https://github.com/microfleet/core/issues/674)) ([209eb8d](https://github.com/microfleet/core/commit/209eb8dd8b2ba086ebda004ead7b25739bade72f))

## [2.2.9](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.8...@microfleet/core-types@2.2.9) (2023-09-27)


### Bug Fixes

* update deps, router .d.ts ([#664](https://github.com/microfleet/core/issues/664)) ([b9df1ac](https://github.com/microfleet/core/commit/b9df1ac56760499418018c723a2f6f8c3fbbbda9))

## [2.2.9](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.8...@microfleet/core-types@2.2.9) (2023-09-27)


### Bug Fixes

* update deps, router .d.ts ([#664](https://github.com/microfleet/core/issues/664)) ([b9df1ac](https://github.com/microfleet/core/commit/b9df1ac56760499418018c723a2f6f8c3fbbbda9))

## [2.2.8](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.7...@microfleet/core-types@2.2.8) (2023-06-20)


### Bug Fixes

* update deps, ensure fastify-plugin is not required ([08f0239](https://github.com/microfleet/core/commit/08f023940232068022aeaecbbb88b619204921d8))

## [2.2.8](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.7...@microfleet/core-types@2.2.8) (2023-06-20)


### Bug Fixes

* update deps, ensure fastify-plugin is not required ([08f0239](https://github.com/microfleet/core/commit/08f023940232068022aeaecbbb88b619204921d8))

## [2.2.7](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.6...@microfleet/core-types@2.2.7) (2023-05-30)


### Bug Fixes

* cleanup sigterm listeners on close ([cd19c53](https://github.com/microfleet/core/commit/cd19c53f1e52fb1a5c5ca1ec82f2bbd055a529ee))

## [2.2.7](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.6...@microfleet/core-types@2.2.7) (2023-05-30)


### Bug Fixes

* cleanup sigterm listeners on close ([cd19c53](https://github.com/microfleet/core/commit/cd19c53f1e52fb1a5c5ca1ec82f2bbd055a529ee))

## [2.2.6](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.5...@microfleet/core-types@2.2.6) (2023-05-17)


### Bug Fixes

* set npm version during release ([24edf47](https://github.com/microfleet/core/commit/24edf478bab0547560103707267226e7105ac363))
* update compatibility for mfleet bin ([01285ed](https://github.com/microfleet/core/commit/01285ed96ce21b68e1eadbddda70c8587c288fd0))

## [2.2.6](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.5...@microfleet/core-types@2.2.6) (2023-05-17)


### Bug Fixes

* set npm version during release ([24edf47](https://github.com/microfleet/core/commit/24edf478bab0547560103707267226e7105ac363))
* update compatibility for mfleet bin ([01285ed](https://github.com/microfleet/core/commit/01285ed96ce21b68e1eadbddda70c8587c288fd0))

## [2.2.5](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.5...@microfleet/core-types@2.2.5) (2023-05-17)


### Bug Fixes

* set npm version during release ([24edf47](https://github.com/microfleet/core/commit/24edf478bab0547560103707267226e7105ac363))

## [2.2.5](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.5...@microfleet/core-types@2.2.5) (2023-05-17)


### Bug Fixes

* set npm version during release ([24edf47](https://github.com/microfleet/core/commit/24edf478bab0547560103707267226e7105ac363))

## [2.2.5](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.3...@microfleet/core-types@2.2.5) (2023-05-17)


### Bug Fixes

* no double increment ([b2e654c](https://github.com/microfleet/core/commit/b2e654c8d3fe000a26e651a4313eed073b3afaf6))

## [2.2.5](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.3...@microfleet/core-types@2.2.5) (2023-05-17)


### Bug Fixes

* no double increment ([b2e654c](https://github.com/microfleet/core/commit/b2e654c8d3fe000a26e651a4313eed073b3afaf6))

## [2.2.4](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.1...@microfleet/core-types@2.2.4) (2023-05-17)


### Bug Fixes

* adjust mfleet loader ([43a2dbe](https://github.com/microfleet/core/commit/43a2dbe0ed1a2a9c6e0263fbae91f74637c6ef98))

## [2.2.3](https://github.com/microfleet/core/compare/@microfleet/core-types@2.2.1...@microfleet/core-types@2.2.3) (2023-05-17)


### Bug Fixes

* adjust mfleet loader ([43a2dbe](https://github.com/microfleet/core/commit/43a2dbe0ed1a2a9c6e0263fbae91f74637c6ef98))

## [2.2.2](https://github.com/microfleet/core/compare/@microfleet/core-types@2.1.0...@microfleet/core-types@2.2.2) (2023-05-17)


### Bug Fixes

* update dependencies ([#645](https://github.com/microfleet/core/issues/645)) ([9e2a778](https://github.com/microfleet/core/commit/9e2a7785bc818dd6f1a920c65c671400a42842cd))
* update dlock wrapper ([7c16a15](https://github.com/microfleet/core/commit/7c16a152d55f9d3a41838944f9e272475cca0977))

## [2.2.1](https://github.com/microfleet/core/compare/@microfleet/core-types@2.1.0...@microfleet/core-types@2.2.1) (2023-05-17)


### Bug Fixes

* update dependencies ([#645](https://github.com/microfleet/core/issues/645)) ([9e2a778](https://github.com/microfleet/core/commit/9e2a7785bc818dd6f1a920c65c671400a42842cd))
* update dlock wrapper ([7c16a15](https://github.com/microfleet/core/commit/7c16a152d55f9d3a41838944f9e272475cca0977))

# [2.2.0](https://github.com/microfleet/core/compare/@microfleet/core-types@1.0.0...@microfleet/core-types@2.2.0) (2023-01-26)


### Features

* common action overrides ([516cebb](https://github.com/microfleet/core/commit/516cebb5f24b6eb050fd524c83e4468dd6f8d82d))

# [2.1.0](https://github.com/microfleet/core/compare/@microfleet/core-types@1.0.0...@microfleet/core-types@2.1.0) (2023-01-26)


### Features

* common action overrides ([516cebb](https://github.com/microfleet/core/commit/516cebb5f24b6eb050fd524c83e4468dd6f8d82d))

# [2.0.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.26.0...@microfleet/core-types@2.0.0) (2023-01-23)


### Features

* init custom plugin with abs path from core ([#641](https://github.com/microfleet/core/issues/641)) ([b9e0a30](https://github.com/microfleet/core/commit/b9e0a30a8f262d50aa325185aca9b49ae4da6eb8))


### BREAKING CHANGES

* several plugins had major version of node updates in its req, hence boosting this

* chore: lockfile
* feat: init custom plugin with abs path from core
* chore: update test env

# [1.0.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.26.0...@microfleet/core-types@1.0.0) (2023-01-23)


### Features

* init custom plugin with abs path from core ([#641](https://github.com/microfleet/core/issues/641)) ([b9e0a30](https://github.com/microfleet/core/commit/b9e0a30a8f262d50aa325185aca9b49ae4da6eb8))


### BREAKING CHANGES

* several plugins had major version of node updates in its req, hence boosting this

* chore: lockfile
* feat: init custom plugin with abs path from core
* chore: update test env

# [0.27.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.24.0...@microfleet/core-types@0.27.0) (2022-11-01)


### Features

* upgrade dependencies, no breaking changes ([#638](https://github.com/microfleet/core/issues/638)) ([2d4de4d](https://github.com/microfleet/core/commit/2d4de4d080be30dcf01ba3f05599ec15618dde90))

# [0.26.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.24.0...@microfleet/core-types@0.26.0) (2022-11-01)


### Features

* upgrade dependencies, no breaking changes ([#638](https://github.com/microfleet/core/issues/638)) ([2d4de4d](https://github.com/microfleet/core/commit/2d4de4d080be30dcf01ba3f05599ec15618dde90))

# [0.25.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.23.1...@microfleet/core-types@0.25.0) (2022-10-27)


### Features

* **plugin-signed-request:** fastify plugin ([#637](https://github.com/microfleet/core/issues/637)) ([ee3d4dd](https://github.com/microfleet/core/commit/ee3d4dd1adc3025dbd6d831aeeb0dce9f44117f0))

# [0.24.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.23.1...@microfleet/core-types@0.24.0) (2022-10-27)


### Features

* **plugin-signed-request:** fastify plugin ([#637](https://github.com/microfleet/core/issues/637)) ([ee3d4dd](https://github.com/microfleet/core/commit/ee3d4dd1adc3025dbd6d831aeeb0dce9f44117f0))

## [0.23.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.22.0...@microfleet/core-types@0.23.2) (2022-09-02)


### Bug Fixes

* improve sentry logger ([#636](https://github.com/microfleet/core/issues/636)) ([93e75da](https://github.com/microfleet/core/commit/93e75da4f3a34606940c2673460c4719dcef2012))

## [0.23.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.22.0...@microfleet/core-types@0.23.1) (2022-09-02)


### Bug Fixes

* improve sentry logger ([#636](https://github.com/microfleet/core/issues/636)) ([93e75da](https://github.com/microfleet/core/commit/93e75da4f3a34606940c2673460c4719dcef2012))

# [0.23.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.21.1...@microfleet/core-types@0.23.0) (2022-08-27)


### Bug Fixes

* upgrade deps ([5ed4b64](https://github.com/microfleet/core/commit/5ed4b64f5bac473ebd267e9dd1abb1077dd7738f))


### Features

* improve sentry logger ([#633](https://github.com/microfleet/core/issues/633)) ([d50fba9](https://github.com/microfleet/core/commit/d50fba93835a0fceb9ada8f52075946e5bf2bed7)), closes [#635](https://github.com/microfleet/core/issues/635)

# [0.22.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.21.1...@microfleet/core-types@0.22.0) (2022-08-27)


### Bug Fixes

* upgrade deps ([5ed4b64](https://github.com/microfleet/core/commit/5ed4b64f5bac473ebd267e9dd1abb1077dd7738f))


### Features

* improve sentry logger ([#633](https://github.com/microfleet/core/issues/633)) ([d50fba9](https://github.com/microfleet/core/commit/d50fba93835a0fceb9ada8f52075946e5bf2bed7)), closes [#635](https://github.com/microfleet/core/issues/635)

## [0.21.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.20.0...@microfleet/core-types@0.21.2) (2022-07-15)


### Bug Fixes

* remove timer based ack defaults ([0babab1](https://github.com/microfleet/core/commit/0babab1a98bedc98c39991f0d07fbd61c5c50409))

## [0.21.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.20.0...@microfleet/core-types@0.21.1) (2022-07-15)


### Bug Fixes

* remove timer based ack defaults ([0babab1](https://github.com/microfleet/core/commit/0babab1a98bedc98c39991f0d07fbd61c5c50409))

# [0.21.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.18.0...@microfleet/core-types@0.21.0) (2022-07-14)


### Bug Fixes

* increase test timeout for slow machines on CI ([61cc970](https://github.com/microfleet/core/commit/61cc970b9c636b4b3a076a3715dc9ec20d6f838d))
* undici vs node-fetch ([bd38a18](https://github.com/microfleet/core/commit/bd38a18f005d0c29a2b73b9e181948cc30ec0543))


### Features

* pino 8 and other deps ([15dfb1b](https://github.com/microfleet/core/commit/15dfb1b3834584ec2c5c6bb20cdd5911055e6dda))

# [0.20.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.18.0...@microfleet/core-types@0.20.0) (2022-07-14)


### Bug Fixes

* increase test timeout for slow machines on CI ([61cc970](https://github.com/microfleet/core/commit/61cc970b9c636b4b3a076a3715dc9ec20d6f838d))
* undici vs node-fetch ([bd38a18](https://github.com/microfleet/core/commit/bd38a18f005d0c29a2b73b9e181948cc30ec0543))


### Features

* pino 8 and other deps ([15dfb1b](https://github.com/microfleet/core/commit/15dfb1b3834584ec2c5c6bb20cdd5911055e6dda))

# [0.19.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.16.0...@microfleet/core-types@0.19.0) (2022-07-11)


### Features

* plugin signed request ([#619](https://github.com/microfleet/core/issues/619)) ([fd51e06](https://github.com/microfleet/core/commit/fd51e062b43743c968affc8b5a2aa4b37380c2cc))# [0.18.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.16.0...@microfleet/core-types@0.18.0) (2022-07-11)


### Features

* plugin signed request ([#619](https://github.com/microfleet/core/issues/619)) ([fd51e06](https://github.com/microfleet/core/commit/fd51e062b43743c968affc8b5a2aa4b37380c2cc))# [0.17.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.14.0...@microfleet/core-types@0.17.0) (2022-06-20)


### Features

* casl RBAC plugin ([#617](https://github.com/microfleet/core/issues/617)) ([5e8a2bd](https://github.com/microfleet/core/commit/5e8a2bd703050c06c85f1846af6362e610c7e38f))# [0.16.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.14.0...@microfleet/core-types@0.16.0) (2022-06-20)


### Features

* casl RBAC plugin ([#617](https://github.com/microfleet/core/issues/617)) ([5e8a2bd](https://github.com/microfleet/core/commit/5e8a2bd703050c06c85f1846af6362e610c7e38f))# [0.15.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.13.1...@microfleet/core-types@0.15.0) (2022-03-30)


### Features

* added ability to disable some route ([#607](https://github.com/microfleet/core/issues/607)) ([afbebd2](https://github.com/microfleet/core/commit/afbebd25ba52b8b70f1f1640554a86dca509a1cf))# [0.14.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.13.1...@microfleet/core-types@0.14.0) (2022-03-30)


### Features

* added ability to disable some route ([#607](https://github.com/microfleet/core/issues/607)) ([afbebd2](https://github.com/microfleet/core/commit/afbebd25ba52b8b70f1f1640554a86dca509a1cf))## [0.13.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.12.0...@microfleet/core-types@0.13.2) (2022-03-25)


### Bug Fixes

* better healthcheck message ([7eed724](https://github.com/microfleet/core/commit/7eed724122c7e40890ee26327e992652c892134f))## [0.13.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.12.0...@microfleet/core-types@0.13.1) (2022-03-25)


### Bug Fixes

* better healthcheck message ([7eed724](https://github.com/microfleet/core/commit/7eed724122c7e40890ee26327e992652c892134f))# [0.13.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.10.0...@microfleet/core-types@0.13.0) (2022-03-24)


### Features

* router re-wiring of requests, independent actions ([fb0bea2](https://github.com/microfleet/core/commit/fb0bea24ce83bfaa6ae51e418d30161e8be7d6a0))# [0.12.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.10.0...@microfleet/core-types@0.12.0) (2022-03-24)


### Features

* router re-wiring of requests, independent actions ([fb0bea2](https://github.com/microfleet/core/commit/fb0bea24ce83bfaa6ae51e418d30161e8be7d6a0))# [0.11.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.9.3...@microfleet/core-types@0.11.0) (2022-03-24)


### Features

* **router:** reconfigure action through enabled param ([44be4ae](https://github.com/microfleet/core/commit/44be4ae4d3ccda8744f3f7dcbe098553f89386d5))# [0.10.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.9.3...@microfleet/core-types@0.10.0) (2022-03-24)


### Features

* **router:** reconfigure action through enabled param ([44be4ae](https://github.com/microfleet/core/commit/44be4ae4d3ccda8744f3f7dcbe098553f89386d5))## [0.9.4](https://github.com/microfleet/core/compare/@microfleet/core-types@0.9.1...@microfleet/core-types@0.9.4) (2022-03-23)


### Bug Fixes

* remove deprecated event-to-promise lib ([3489d98](https://github.com/microfleet/core/commit/3489d9866f8273c86cdff6722e582df747572c8d))## [0.9.3](https://github.com/microfleet/core/compare/@microfleet/core-types@0.9.1...@microfleet/core-types@0.9.3) (2022-03-23)


### Bug Fixes

* remove deprecated event-to-promise lib ([3489d98](https://github.com/microfleet/core/commit/3489d9866f8273c86cdff6722e582df747572c8d))## [0.9.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.8.0...@microfleet/core-types@0.9.2) (2022-03-23)


### Bug Fixes

* dependencies, updated transport-amqp ([4ca88c7](https://github.com/microfleet/core/commit/4ca88c7f8b84390f85b64dea3a665558f48d8d3b))## [0.9.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.8.0...@microfleet/core-types@0.9.1) (2022-03-23)


### Bug Fixes

* dependencies, updated transport-amqp ([4ca88c7](https://github.com/microfleet/core/commit/4ca88c7f8b84390f85b64dea3a665558f48d8d3b))# [0.9.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.7.1...@microfleet/core-types@0.9.0) (2022-03-16)


### Features

* microleet/transport-amqp@17 ([#604](https://github.com/microfleet/core/issues/604)) ([c06a64d](https://github.com/microfleet/core/commit/c06a64d10771f71808f01b954472d1ad86786965))# [0.8.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.7.1...@microfleet/core-types@0.8.0) (2022-03-16)


### Features

* microleet/transport-amqp@17 ([#604](https://github.com/microfleet/core/issues/604)) ([c06a64d](https://github.com/microfleet/core/commit/c06a64d10771f71808f01b954472d1ad86786965))undefined

## [0.7.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.6.0...@microfleet/core-types@0.7.2) (2022-02-28)


### Bug Fixes

* peer x-deps ([df1619d](https://github.com/microfleet/core/commit/df1619d84d9f9ae404aae2d75e2c0047576176de))undefined

## [0.7.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.6.0...@microfleet/core-types@0.7.1) (2022-02-28)


### Bug Fixes

* peer x-deps ([df1619d](https://github.com/microfleet/core/commit/df1619d84d9f9ae404aae2d75e2c0047576176de))undefined

# [0.7.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.13...@microfleet/core-types@0.7.0) (2022-02-27)


### Features

* support v16 of @microfleet/transport-amqp ([71579d7](https://github.com/microfleet/core/commit/71579d77cf179607477d1b803cf569c453b354b3))undefined

# [0.6.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.13...@microfleet/core-types@0.6.0) (2022-02-27)


### Features

* support v16 of @microfleet/transport-amqp ([71579d7](https://github.com/microfleet/core/commit/71579d77cf179607477d1b803cf569c453b354b3))## [0.5.14](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.11...@microfleet/core-types@0.5.14) (2022-02-25)


### Bug Fixes

* **amqp:** dont crash on missing headers ([0ca3783](https://github.com/microfleet/core/commit/0ca3783bbde7980c34462da58c7c62fbcc6142f8))

## [0.5.13](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.11...@microfleet/core-types@0.5.13) (2022-02-25)


### Bug Fixes

* **amqp:** dont crash on missing headers ([0ca3783](https://github.com/microfleet/core/commit/0ca3783bbde7980c34462da58c7c62fbcc6142f8))

## [0.5.12](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.9...@microfleet/core-types@0.5.12) (2022-02-24)


### Bug Fixes

* remove amqp type stubs ([60c9c7a](https://github.com/microfleet/core/commit/60c9c7a0e85ef68832aa7150469c10f3a8828a04))

## [0.5.11](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.9...@microfleet/core-types@0.5.11) (2022-02-24)


### Bug Fixes

* remove amqp type stubs ([60c9c7a](https://github.com/microfleet/core/commit/60c9c7a0e85ef68832aa7150469c10f3a8828a04))

## [0.5.10](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.7...@microfleet/core-types@0.5.10) (2022-02-24)


### Bug Fixes

* update deps ([97f391b](https://github.com/microfleet/core/commit/97f391b4d7c24410f532873ece685c072f3453d9))
* upgrade amqp ([8d735db](https://github.com/microfleet/core/commit/8d735db31e1029fd7f6cb23633686435bb72f4d0))
* upgrade transport-amqp ([382a1bf](https://github.com/microfleet/core/commit/382a1bf57626d375c5c8d3a959bba8f20bb27801))

## [0.5.9](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.7...@microfleet/core-types@0.5.9) (2022-02-24)


### Bug Fixes

* update deps ([97f391b](https://github.com/microfleet/core/commit/97f391b4d7c24410f532873ece685c072f3453d9))
* upgrade amqp ([8d735db](https://github.com/microfleet/core/commit/8d735db31e1029fd7f6cb23633686435bb72f4d0))
* upgrade transport-amqp ([382a1bf](https://github.com/microfleet/core/commit/382a1bf57626d375c5c8d3a959bba8f20bb27801))

## [0.5.8](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.5...@microfleet/core-types@0.5.8) (2022-02-22)


### Bug Fixes

* **router:** add `enabled` into ajv schema ([b2b4a28](https://github.com/microfleet/core/commit/b2b4a2821fc1cc70b941e8acb15b46b3ff82eba8))

## [0.5.7](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.5...@microfleet/core-types@0.5.7) (2022-02-22)


### Bug Fixes

* **router:** add `enabled` into ajv schema ([b2b4a28](https://github.com/microfleet/core/commit/b2b4a2821fc1cc70b941e8acb15b46b3ff82eba8))

## [0.5.6](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.3...@microfleet/core-types@0.5.6) (2022-02-06)


### Bug Fixes

* sentry fn opts ([4a81984](https://github.com/microfleet/core/commit/4a81984224c4b42d4184ee6d365b7ac8ad4f704d))

## [0.5.5](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.3...@microfleet/core-types@0.5.5) (2022-02-06)


### Bug Fixes

* sentry fn opts ([4a81984](https://github.com/microfleet/core/commit/4a81984224c4b42d4184ee6d365b7ac8ad4f704d))

## [0.5.4](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.1...@microfleet/core-types@0.5.4) (2022-02-04)


### Bug Fixes

* dlock with connect/close interface ([#593](https://github.com/microfleet/core/issues/593)) ([5aa9bae](https://github.com/microfleet/core/commit/5aa9baeddff6c9737a1d36f95859e9895bf99acb))

## [0.5.3](https://github.com/microfleet/core/compare/@microfleet/core-types@0.5.1...@microfleet/core-types@0.5.3) (2022-02-04)


### Bug Fixes

* dlock with connect/close interface ([#593](https://github.com/microfleet/core/issues/593)) ([5aa9bae](https://github.com/microfleet/core/commit/5aa9baeddff6c9737a1d36f95859e9895bf99acb))

## [0.5.2](https://github.com/microfleet/core/compare/@microfleet/core-types@0.4.0...@microfleet/core-types@0.5.2) (2022-01-31)


### Bug Fixes

* remove wtfnode from deps ([035482c](https://github.com/microfleet/core/commit/035482cb461afb5399b4ed40b18fc1eab5dd0315))
* update dependencies ([4d3fcce](https://github.com/microfleet/core/commit/4d3fcce259f8a047a94dc40fc66604fae8a97050))


### Reverts

* router types exploration ([40ece1e](https://github.com/microfleet/core/commit/40ece1e8e701ac3e3f34f97016b1a94f517da515))

## [0.5.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.4.0...@microfleet/core-types@0.5.1) (2022-01-31)


### Bug Fixes

* remove wtfnode from deps ([035482c](https://github.com/microfleet/core/commit/035482cb461afb5399b4ed40b18fc1eab5dd0315))
* update dependencies ([4d3fcce](https://github.com/microfleet/core/commit/4d3fcce259f8a047a94dc40fc66604fae8a97050))


### Reverts

* router types exploration ([40ece1e](https://github.com/microfleet/core/commit/40ece1e8e701ac3e3f34f97016b1a94f517da515))

# [0.5.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.3.0...@microfleet/core-types@0.5.0) (2022-01-31)


### Bug Fixes

* **kafka:** kafka throws when connecting to non-existent topics ([5cdf1a8](https://github.com/microfleet/core/commit/5cdf1a8cffaca0d166f97a169209f2d579804f73))
* **kafka:** use @makeomatic/node-rdkafka ([7627d66](https://github.com/microfleet/core/commit/7627d669ad49032f3a2f4be15a12a678d7136464))
* **router:** graceful shutdown fixed ([5f49652](https://github.com/microfleet/core/commit/5f49652458eb6c622f519259ae865cac42b48961))
* **tooling:** dep versions for pnpm ([cac9f31](https://github.com/microfleet/core/commit/cac9f31a9e1e8577cb0251646410199d2b6c3eb8))


### Features

* @swc/node ([260e1bb](https://github.com/microfleet/core/commit/260e1bb049563df1b3795f1ac47699103601a87f))

# [0.4.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.3.0...@microfleet/core-types@0.4.0) (2022-01-31)


### Bug Fixes

* **kafka:** kafka throws when connecting to non-existent topics ([5cdf1a8](https://github.com/microfleet/core/commit/5cdf1a8cffaca0d166f97a169209f2d579804f73))
* **kafka:** use @makeomatic/node-rdkafka ([7627d66](https://github.com/microfleet/core/commit/7627d669ad49032f3a2f4be15a12a678d7136464))
* **router:** graceful shutdown fixed ([5f49652](https://github.com/microfleet/core/commit/5f49652458eb6c622f519259ae865cac42b48961))
* **tooling:** dep versions for pnpm ([cac9f31](https://github.com/microfleet/core/commit/cac9f31a9e1e8577cb0251646410199d2b6c3eb8))


### Features

* @swc/node ([260e1bb](https://github.com/microfleet/core/commit/260e1bb049563df1b3795f1ac47699103601a87f))

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.3.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.2.1...@microfleet/core-types@0.3.0) (2022-01-19)


### Features

* upgrade plugin-validation and update deps ([#581](https://github.com/microfleet/core/issues/581)) ([f71edfa](https://github.com/microfleet/core/commit/f71edfa4a753a0dc2918ee7664306f79d5e5a09e))





## [0.2.1](https://github.com/microfleet/core/compare/@microfleet/core-types@0.2.0...@microfleet/core-types@0.2.1) (2021-11-23)

**Note:** Version bump only for package @microfleet/core-types





# [0.2.0](https://github.com/microfleet/core/compare/@microfleet/core-types@0.1.0...@microfleet/core-types@0.2.0) (2021-11-23)


### Features

* pino 7 transports, mocha & jest tests ([3f90cda](https://github.com/microfleet/core/commit/3f90cda510f2891c87087d1b7c0106150d2d7ba1))





# 0.1.0 (2021-07-08)


### Bug Fixes

* conflicts ([035ec0d](https://github.com/microfleet/core/commit/035ec0da4959036ba6b31c948c0d06713dafa5b8))
* update dlock plugin ([2f506ac](https://github.com/microfleet/core/commit/2f506ac0d472db27cd6637c5138b1b2e38ae91ce))
* **tests:** upgrade transport-amqp ([012e4ee](https://github.com/microfleet/core/commit/012e4eecad069782c2c55dde92f88df503669a1e))
* couchdb plugin ([fd9289b](https://github.com/microfleet/core/commit/fd9289bcad542efe83af1746af2a2c9ca3e75604))
* merge router to validator branch ([bfb9258](https://github.com/microfleet/core/commit/bfb92589e391a0f2c2d5b232744695b0ae4b8dfc))
* type updates ([af430df](https://github.com/microfleet/core/commit/af430dff91213d280e5aa3f0fd5592695553e9c2))


### Features

* elasticsearch, redis plugins ([79bc4c3](https://github.com/microfleet/core/commit/79bc4c384abb8cf9902697cc3931130e00397a69))
* improve perf based on benchmarks ([2ad3aac](https://github.com/microfleet/core/commit/2ad3aac102721d47184263b008ff1d92fa54d754))
* kafka upgrades, remove unused plugins ([12f8018](https://github.com/microfleet/core/commit/12f8018ceade8d95759da09eac8bab2ab9a9aade))
* move out plugin validator ([47abe87](https://github.com/microfleet/core/commit/47abe87e8252eb427ee72de46d7e9740f2071ab5))
* plugin aws elasticsearch ([b299436](https://github.com/microfleet/core/commit/b29943652af7d933d274aec0da3d457bb57bbf2e))
* plugin-cassandra ([2a53771](https://github.com/microfleet/core/commit/2a5377101a296bec97dddde1349c3de3c509aab9))