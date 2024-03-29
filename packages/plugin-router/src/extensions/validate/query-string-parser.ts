import { parse } from 'qs'
import { Lifecycle } from '../../lifecycle/index'
import { ServiceRequest } from '../../types/router'

type QSParserAugmentedAction = ServiceRequest & {
  action: ServiceRequest['action'] & {
    transformQuery?: (...args: any[]) => any;
    transformOpts?: any;
  };
}

const identity = <T>(param: T): T => param

async function preValidate(request: QSParserAugmentedAction): Promise<any> {
  const { query } = request

  // if present - remap, otherwise just noop
  if (query) {
    const { action } = request
    const { transformQuery = identity, transformOpts } = action

    request.query = transformQuery(parse(query, {
      depth: 1,
      parameterLimit: 10,
      parseArrays: false,
      ...transformOpts,
    }))
  }
}

export default [{
  handler: preValidate,
  point: Lifecycle.hooks.preValidate,
}]
