import { RunnerParams } from '../runner'

export default abstract class Lifecycle {
  public static readonly points = {
    preAllowed: 'preAllowed',
    postAllowed: 'postAllowed',
    preAuth: 'preAuth',
    postAuth: 'postAuth',
    preHandler: 'preHandler',
    postHandler: 'postHandler',
    preRequest: 'preRequest',
    postRequest: 'postRequest',
    preResponse: 'preResponse',
    postResponse: 'postResponse',
    preValidate: 'preValidate',
    postValidate: 'postValidate',
  } as const

  abstract run(request: RunnerParams): Promise<void>
}
