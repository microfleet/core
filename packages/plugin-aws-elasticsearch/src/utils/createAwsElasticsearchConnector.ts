export default (awsConfig: AWS.Config): any => ({
  Connection: require('./AmazonConnection')(awsConfig),
  Transport: require('./AmazonTransport')(awsConfig)
})
