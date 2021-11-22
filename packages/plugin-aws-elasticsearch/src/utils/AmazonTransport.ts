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

import { Transport } from '@opensearch-project/opensearch'
import type { Config } from 'aws-sdk'
import { strict as assert } from 'assert'

function awaitAwsCredentials(awsConfig: Config): Promise<void> {
  return new Promise((resolve, reject) => {
    awsConfig.getCredentials((err) => {
      err ? reject(err) : resolve()
    })
  })
}
export type TransportOptions = ConstructorParameters<typeof Transport>

export class AmazonTransport extends Transport {
  static awsConfig: Config

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  request(params: any, options = {}, callback: any = undefined): any {
    // options is optional, so if it is omitted, options will be the callback
    if (typeof options === 'function') {
      callback = options
      options = {}
    }

    const promise = awaitAwsCredentials(AmazonTransport.awsConfig)
      .then(() => super.request(params, options))

    // Promise support
    if (typeof callback === 'undefined') {
      return promise
    }

    promise.then(resp => callback(null, resp)).catch(callback)
  }
}

export const GetAmazonTransport = (awsConfig: Config): typeof Transport => {
  assert(!AmazonTransport.awsConfig, 'awsConfig redefinedd')
  AmazonTransport.awsConfig = awsConfig
  return AmazonTransport
}
