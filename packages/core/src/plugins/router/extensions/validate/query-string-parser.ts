import identity = require('lodash/identity')
import { parse } from 'qs'
import { IServiceRequest } from '../../../../types'

type QSParserAugmentedAction = IServiceRequest & {
  action: IServiceRequest['action'] & {
    transformQuery?: (...args: any[]) => any,
    transformOpts?: any
  }
}

function preValidate(request: QSParserAugmentedAction) {
  const { query } = request

  // if present - remap, otherwise just noop
  if (query) {
    const { action } = request
    const { transformQuery = identity, transformOpts } = action

    // eslint-disable-next-line no-param-reassign
    request.query = transformQuery(parse(query, {
      depth: 1,
      parameterLimit: 10,
      parseArrays: false,
      ...transformOpts,
    }))
  }

  return request
}

export default [{
  handler: preValidate,
  point: 'preValidate',
}]
