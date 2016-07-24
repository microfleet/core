# Module lifecycle

## Usage
```js
const moduleLifecycle = require('./');

moduleLifecycle(module, promiseFactory, extensions, args = [], context)
  .then(result => resultHandler)
  .catch(error => errorHandler)
  
```

* `module` - a module name
* `promiseFactory` - a function that returns `Promise`
* `extensions` - an `Extensions` instance
* `args` - an array of arguments passed to `pre-extension` handlers 
   and `promiseFactory` handler
* `context` `this` context of extensions handlers 
   and `promiseFactory` handler

## Lifecycle

* `preHandler` - Lifecycle point that executes array of functions 
   in series before `handler`. Functions take spread `args` as arguments.
   Each function must return `Promise` that resolves `args` for next 
   point (it can be the next `preHandler` or `handler`) or rejected error;
    * if `preHandler` array is empty execution continues with 'handler'
    * if `Promise` is rejected lifecycle breaks to final catch
    * if `Promise` is resolved execution continues with 'handler'
* `handler` - executes a `promiseFactory` function that returns `Promise`.
  Function takes spread `args` (it can be `args` from arguments 
  or `preHandler` result) as arguments.
    * if `Promise` is rejected
        * if `postHandler` array is not empty lifecycle breaks 
        to `postHandler` with rejected error
        * if `postHandler` array is empty lifecycle breaks to final catch
    * if `Promise` is resolved
        * if `postHandler` array is not empty execution continues 
          with `postHandler` called with resolved result
        * if `postHandler` array is empty result is resolved
* `postHandler` - Lifecycle point that executes array of functions 
  in series after `handler`. Functions take error as first argument 
  and result as second argument. Each function returns `Promise` that 
  must either be resolved with an array that contains error and result 
  or be rejected with error
    * if `Promise` is rejected lifecycle breaks to final catch
    * if `Promise` resolves not empty error lifecycle breaks to final 
      catch else lifecycle continues with result

