import * as microfleet from '@microfleet/core'
import { KafkaPlugin } from '../kafka'

declare module '@microfleet/core' {
  export interface Microfleet extends KafkaPlugin {}
}
