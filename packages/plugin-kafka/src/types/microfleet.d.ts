import { KafkaFactory } from '../kafka'
import * as _ from '@microfleet/core'

declare module '@microfleet/core' {
  export interface Microfleet {
    kafka: KafkaFactory
    some: string
  }
}
