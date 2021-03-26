const { Transport } = require('@elastic/elasticsearch')

function awaitAwsCredentials(awsConfig) {
  return new Promise((resolve, reject) => {
    awsConfig.getCredentials((err) => {
      err ? reject(err) : resolve()
    })
  })
}

module.exports = awsConfig => {
  class AmazonTransport extends Transport {
    request(params, options = {}, callback = undefined) {
      // options is optional, so if it is omitted, options will be the callback
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      // Promise support
      if (typeof callback === 'undefined') {
        return awaitAwsCredentials(awsConfig)
          .then(() => super.request(params, options))
      }

      // Callback support
      awaitAwsCredentials(awsConfig)
        .then(() => super.request(params, options, callback))
        .catch(callback)
    }
  }

  return AmazonTransport
}
