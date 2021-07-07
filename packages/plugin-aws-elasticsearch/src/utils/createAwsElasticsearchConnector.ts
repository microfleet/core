import { Config } from 'aws-sdk'
import { GetAmazonConnection } from './AmazonConnection'
import { GetAmazonTransport } from './AmazonTransport'

export const createAwsElasticsearchConnector = (awsConfig: Config): {
  Connection: ReturnType<typeof GetAmazonConnection>,
  Transport: ReturnType<typeof GetAmazonTransport>
} => ({
  Connection: GetAmazonConnection(awsConfig),
  Transport: GetAmazonTransport(awsConfig)
})
