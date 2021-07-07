const fastify = require('fastify')

const server = fastify()

server.get('/hello', function (req, reply) {
  reply.send({ hello: 'world' })
})

server.listen(3000)
