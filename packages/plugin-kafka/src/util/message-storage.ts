import { TimeoutError } from 'common-errors'

interface RecordOpts {
  reject: (reason?: any) => void
  resolve: (value?: unknown) => void
  timeout: number
  timer: number
}

export class MessageStorage {
  storage: Map<string, RecordOpts>

  constructor() {
    this.storage = new Map()
    this.onTimeout = this.onTimeout.bind(this)
  }

  /**
   * Invoked on Timeout Error
   * @param  {string} messageId
   * @returns {Void}
   */
  onTimeout(messageId: string) {
    const { storage } = this
    const { reject, timeout } = storage.get(messageId)!

    storage.delete(messageId)
    setImmediate(reject, new TimeoutError(timeout.toString()))
  }

  /**
   * Stores correlation ID in the memory storage
   * @param  {string} messageId
   * @param  {Object} opts - Container.
   * @param  {Function} opts.resolve -  promise resolve action.
   * @param  {Function} opts.reject - promise reject action.
   * @param  {number} opts.timeout - expected response time.
   * @returns {Void}
   */
  push(messageId: string, opts: RecordOpts) {
    opts.timer = setTimeout(this.onTimeout, opts.timeout, messageId)
    this.storage.set(messageId, opts)
  }

  /**
   * Rejects stored promise with an error & cleans up
   * Timeout error
   * @param  {string} messageId
   * @param  {Error} error
   * @returns {void}
   */
  reject(messageId: string, error: Error) {
    const { storage } = this
    const { timer, reject } = storage.get(messageId)!

    clearTimeout(timer)
    storage.delete(messageId)
    setImmediate(reject, error)
  }

  pop(messageId: string) {
    const future = this.storage.get(messageId)

    if (future === undefined) {
      return undefined
    }

    clearTimeout(future.timer)
    this.storage.delete(messageId)
    return future
  }
}
