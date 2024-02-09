exports.min = 10
exports.final = 11
exports.script = ({ redis }) => redis.set('migration_01', 'done')
