// @todo utils
export type Primitive = string | number | boolean | undefined | null
// @todo utils
export function literal<T extends Primitive>(value: T): T {
  return value
}

/**
 * Constants with possilble transport values
 * @todo declare amqp, http and etc. from it own router plugin?
 */
export const ActionTransport = {
  amqp: literal('amqp'),
  http: literal('http'),
  internal: literal('internal'),
  socketio: literal('socketio'),
}

// based on this we validate input data
// @todo declare amqp, http and etc. from it own router plugin?
export const DATA_KEY_SELECTOR = {
  amqp: literal('params'),
  delete: literal('query'),
  get: literal('query'),
  head: literal('query'),
  internal: literal('params'),
  patch: literal('params'),
  post: literal('params'),
  put: literal('params'),
  socketio: literal('params'),
}

export type RequestCallback = (err: any, result?: any) => void
