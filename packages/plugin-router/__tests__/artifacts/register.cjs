// eslint-disable-next-line @typescript-eslint/no-var-requires
const { register } = require('@swc-node/register/register')

const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx']

register({}, {
  exts: [...DEFAULT_EXTENSIONS, '.cts', '.mts']
})
