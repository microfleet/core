module.exports = {
  require: [
    '@swc-node/register',
    'tsconfig-paths/register',
  ],
  extension: ['ts', 'js', 'cjs'],
  timeout: 10000,
}
