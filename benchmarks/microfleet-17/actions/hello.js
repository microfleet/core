async function hello() {
  return { hello: 'world' }
}

hello.schema = false

module.exports = hello
