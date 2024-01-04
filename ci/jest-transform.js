// @ts-check

/**
 * @typedef {import('@swc/core').Output} Output
 * @typedef {import('@swc/core').Options} Options
 *
 * @typedef {object} JestConfig26
 * @prop {[match: string, transformerPath: string, options: Options][]} transform
 *
 * @typedef {object} JestConfig27
 * @prop {Options} transformerConfig
 */

const { xxh64 } = require('@node-rs/xxhash')
const { transformJest } = require('@swc-node/core')
const { readDefaultTsConfig, tsCompilerOptionsToSwcConfig } = require('@swc-node/register/read-default-tsconfig')

/**
 *
 * @param {JestConfig26 | JestConfig27} jestConfig
 * @returns {Options}
 */
function getJestTransformConfig(jestConfig) {
  if ('transformerConfig' in jestConfig) {
    // jest 27
    return jestConfig.transformerConfig
  }

  if ('transform' in jestConfig) {
    // jest 26
    return jestConfig.transform.find(([, transformerPath]) => transformerPath === __filename)?.[2] ?? {}
  }

  return {}
}

const defaultTsConfig = readDefaultTsConfig()

module.exports = {
  /**
   *
   * @param {string} src
   * @param {string} path
   * @param {JestConfig26 | JestConfig27} jestConfig
   * @returns {Output | string}
   */
  process(src, path, jestConfig) {
    if (/\.([cm]?tsx?|jsx?|mjs)$/.test(path)) {
      // @ts-expect-error typing
      return transformJest(src, path, {
        ...tsCompilerOptionsToSwcConfig(defaultTsConfig, path),
        ...getJestTransformConfig(jestConfig),
      })
    }

    return src
  },
  /**
   *
   * @param {string} src
   * @param {string} _filepath
   * @param {Options} config
   * @returns {string}
   */
  getCacheKey(src, _filepath, config) {
    return xxh64(src + JSON.stringify(config)).toString(16)
  },
}
