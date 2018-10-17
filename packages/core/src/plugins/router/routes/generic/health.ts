import { HttpStatusError } from 'common-errors'
import { PLUGIN_STATUS_FAIL } from '../../../../constants'
import { ActionTransport, Microfleet } from '../../../..'

async function genericHealthCheck(this: Microfleet) {
  const data = await this.getHealthStatus()

  if (PLUGIN_STATUS_FAIL === data.status) {
    throw new HttpStatusError(500, `Unhealthy due to following plugins: ${data.failed.map(it => it.name).join(', ')}`)
  }

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
