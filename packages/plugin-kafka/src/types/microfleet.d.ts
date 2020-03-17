import { KafkaFactoryInterface } from '../kafka'

declare module '@microfleet/core' {
  export interface Microfleet {
    kafka: KafkaFactoryInterface
  }
}
