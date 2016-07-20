function getAMQPRequest(amqp) {
  return (route, message) => amqp.publishAndWait(route, message);
}

module.exports = getAMQPRequest;
