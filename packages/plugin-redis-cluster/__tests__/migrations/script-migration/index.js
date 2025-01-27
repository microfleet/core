const fs = require('node:fs')

const script = fs.readFileSync(`${__dirname}/migration.lua`, 'utf8')
exports.min = 2
exports.final = 10

exports.script = async ({ redis }) => {
  await redis.get('cardinality')
  return redis.eval(script, 1, 'some-index-key', 10)
}
