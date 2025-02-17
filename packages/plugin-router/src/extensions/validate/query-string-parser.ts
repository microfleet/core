import { parse, type ParsedQs } from 'qs'
import { Lifecycle } from '../../lifecycle/index'
import { ServiceRequest } from '../../types/router'

type QSParserAugmentedAction = ServiceRequest & {
  action: ServiceRequest['action'] & {
    transformQuery?: (input: Record<string, any>) => ParsedQs;
    transformOpts?: Parameters<typeof parse>[1];
  };
}

const identity = <T>(param: T): T => param

async function preValidate(request: QSParserAugmentedAction): Promise<any> {
  const { query } = request

  // if present - remap, otherwise just noop
  if (query) {
    const { action } = request
    const { transformQuery = identity, transformOpts } = action

    // module actually handles all variations of input
    request.query = transformQuery(parse(query as any, {
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
