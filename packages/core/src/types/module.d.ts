declare module '@microfleet/transport-amqp/lib/utils/serialization'
declare module 'sort-by'
declare module 'rfdc'
declare module 'socketio-wildcard'

declare module "eventemitter3" {
  type EventNames<T extends string | symbol | { [K in string | symbol]: any[] }> = T extends string | symbol ? T : keyof T;
  type EventArgs<T extends string | symbol | { [K in string | symbol]: any[] }, K extends EventNames<T>> = T extends string | symbol ? any[] : K extends keyof T ? T[K] : never;

  /**
   * Minimal `EventEmitter` interface that is molded against the Node.js
   * `EventEmitter` interface.
   */
  class EventEmitter<EventTypes extends string | symbol | { [K in keyof EventTypes]: any[] } = string | symbol> {
    static prefixed: string | boolean;

    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     */
    eventNames(): Array<EventNames<EventTypes>>;

    /**
     * Return the listeners registered for a given event.
     */
    listeners<T extends EventNames<EventTypes>>(event: T): Array<EventEmitter.ListenerFn<EventArgs<EventTypes, T>>>;

    /**
     * Return the number of listeners listening to a given event.
     */
    listenerCount(event: EventNames<EventTypes>): number;

    /**
     * Calls each of the listeners registered for a given event.
     */
    emit<T extends EventNames<EventTypes>>(event: T, ...args: EventArgs<EventTypes, T>): boolean;

    /**
     * Add a listener for a given event.
     */
    on<T extends EventNames<EventTypes>>(event: T, fn: EventEmitter.ListenerFn<EventArgs<EventTypes, T>>, context?: any): this;
    addListener<T extends EventNames<EventTypes>>(event: T, fn: EventEmitter.ListenerFn<EventArgs<EventTypes, T>>, context?: any): this;

    /**
     * Add a one-time listener for a given event.
     */
    once<T extends EventNames<EventTypes>>(event: T, fn: EventEmitter.ListenerFn<EventArgs<EventTypes, T>>, context?: any): this;

    /**
     * Remove the listeners of a given event.
     */
    removeListener<T extends EventNames<EventTypes>>(event: T, fn?: EventEmitter.ListenerFn<EventArgs<EventTypes, T>>, context?: any, once?: boolean): this;
    off<T extends EventNames<EventTypes>>(event: T, fn?: EventEmitter.ListenerFn<EventArgs<EventTypes, T>>, context?: any, once?: boolean): this;

    /**
     * Remove all listeners, or those of the specified event.
     */
    removeAllListeners(event?: EventNames<EventTypes>): this;
  }

  namespace EventEmitter {
    export interface ListenerFn<Args extends any[] = any[]> {
      (...args: Args): any;
    }

    export interface EventEmitterStatic {
      new <EventTypes extends string | symbol | { [K in keyof EventTypes]: any[] } = string | symbol>(): EventEmitter<EventTypes>;
    }
  }

  export = EventEmitter;
}
