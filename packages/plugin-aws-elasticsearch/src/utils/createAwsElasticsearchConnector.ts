import { AmazonConnection } from './AmazonConnection';
import { AmazonTransport } from './AmazonTransport';

export function createAwsElasticsearchConnector(awsConfig: AWS.Config): any {
  return ({
    Connection: AmazonConnection(awsConfig),
    Transport: AmazonTransport(awsConfig)
  })
}
