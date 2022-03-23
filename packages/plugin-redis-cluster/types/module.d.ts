declare module 'promise-toolbox/fromEvent' {
  import EventEmitter from "events"

  function fromEvent<T = any>(em: EventEmitter, event: string | symbol, opts?: {
    array?: boolean
    ignoreErrors?: boolean
    error?: string
  }) : Promise<T>

  export = fromEvent
}
