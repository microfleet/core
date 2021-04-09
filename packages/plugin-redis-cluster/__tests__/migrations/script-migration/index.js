const fs = require('fs')

const script = fs.readFileSync(`${__dirname}/migration.lua`, 'utf8')
exports.min = 2
exports.final = 10

exports.script = ({ redis }) => redis
  .get('cardinality')
  .return(10)
  .then((cardinality) => {
    return redis.eval(script, 1, 'some-index-key', cardinality)
  })
