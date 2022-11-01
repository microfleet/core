import consul from 'consul'
// @ts-expect-error no types
import errors from 'consul/lib/errors'
// @ts-expect-error no types
import utils from 'consul/lib/utils'

// magic flag 0x2ddccbc058a50c18
const LOCK_FLAG_VALUE = '3304740253564472344'

/**
 * Wait for non-locked resource
 */
consul.Lock.prototype._wait = function (ctx: any) {
  const retry = () => {
    utils.setTimeoutContext(() => {
      this._run(ctx)
    }, ctx, ctx.lockRetryTime)
  }

  const opts = utils.defaults({
    key: ctx.key,
    wait: ctx.lockWaitTime,
    timeout: ctx.lockWaitTimeout,
    ctx: ctx,
    index: ctx.index,
  }, this._defaults, this.consul._defaults)

  this.consul.kv.get(opts, (err: any, data: any, res: any) => {
    if (err) return this._end(ctx, err, res)

    if (data) {
      // we try to use the same magic number as consul/api in an attempt to be
      // compatible
      if (data.Flags !== +LOCK_FLAG_VALUE) {
        err = errors.Validation('consul: lock: existing key does not match lock use')
        return this._end(ctx, err, res)
      }

      const newIndex = res.headers['x-consul-index']
      if (utils.hasIndexChanged(newIndex, ctx.index)) ctx.index = newIndex

      if (data.Session && (data.Session !== ctx.session.id)) {
        this.emit('retry', { leader: data.Session })
        return retry()
      }
    } else if (res.statusCode !== 404) {
      return this._end(ctx, new Error('consul: lock: error getting key'), res)
    }

    ctx.state = 'acquire'

    this._run(ctx)
  })
}

export default consul
