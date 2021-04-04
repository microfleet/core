/**
  Copyright (c) 2019 by Jonathon Hill

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

const { Transport } = require('@elastic/elasticsearch')

function awaitAwsCredentials(awsConfig: AWS.Config): Promise<void> {
  return new Promise((resolve, reject) => {
    awsConfig.getCredentials((err) => {
      err ? reject(err) : resolve()
    })
  })
}

export const AmazonTransport: any = (awsConfig: AWS.Config) => {
  class AmazonTransport extends Transport {
    request(params: any, options = {}, callback: any = undefined): any {
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
