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

const { Connection } = require('@elastic/elasticsearch')
const aws4 = require('aws4')

export const AmazonConnection: any = (awsConfig: AWS.Config) => {
  class AmazonConnection extends Connection {
    buildRequestObject(params: any) {
      const req = super.buildRequestObject(params)

      req.service = 'es'

      if (awsConfig.region) {
        req.region = awsConfig.region
      }

      if (!req.headers) {
        req.headers = {}
      }

      // Fix the Host header, since HttpConnector.makeReqParams() appends
      // the port number which will cause signature verification to fail
      req.headers.host = req.hostname

      // This fix allows the connector to work with the older 6.x elastic branch.
      // The problem with that version, is that the Transport object would add a
      // `Content-Length` header (yes with Pascal Case), thus duplicating headers
      // (`Content-Length` and `content-length`), which makes the signature fail.
      let contentLength = 0
      if (params.body) {
        contentLength = Buffer.byteLength(params.body, 'utf8')
        req.body = params.body
      }
      const lengthHeader = 'content-length'
      const headerFound = Object.keys(req.headers).find(
        header => header.toLowerCase() === lengthHeader)
      if (headerFound === undefined) {
        req.headers[lengthHeader] = contentLength
      }

      return aws4.sign(req, awsConfig.credentials)
    }
  }

  return AmazonConnection
}
