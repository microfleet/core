# Microfleet AWS-Elasticsearch Plugin

Adds AWS Elastic service support to microfleet. 

## Install

`yarn add @microfleet/plugin-aws-elasticsearch`

## Configuration

To make use of the plugin, adjust microfleet configuration in the following way:

```ts
exports.plugins = [
  ...,
  'aws-elasticsearch'
  ...
]
```

```ts
exports.awsElasticsearch = {
  'awsAccessKey',
  'awsSecretKey',
  'node',
  'region'
}
```
