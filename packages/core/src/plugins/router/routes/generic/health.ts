import { ActionTransport, Microfleet } from '../../../..'

async function genericHealthCheck(this: Microfleet) {
  const data = await this.getHealthStatus()
  return { data }
}

// to avoid 'setTransportAsDefault: false' and make things obvious
genericHealthCheck.transports = [
  ActionTransport.http,
  ActionTransport.amqp,
  ActionTransport.internal,
  ActionTransport.socketIO,
]

export default genericHealthCheck
