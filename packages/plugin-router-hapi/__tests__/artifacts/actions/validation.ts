import { ActionTransport } from '@microfleet/plugin-router'
import { ValidationError } from 'common-errors'

export default function validationError(): any {
  const err = new ValidationError('sample')
  err.addErrors([
    new ValidationError('first', 'E_FIRST'),
    new ValidationError('first', 'E_SECOND')
  ])

  throw err
}

validationError.schema = false
validationError.transports = [ActionTransport.http]
