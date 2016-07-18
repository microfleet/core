# Module lifecycle

## Usage
```js
const moduleLifecycle = require('./');

moduleLifecycle(module, promiseFactory, extensions, args = [])
  .then(result => resultHandler)
  .catch(error => errorHandler)
  
```

* `module` - a module name
* `promiseFactory` - a function that returns `Promise`
* `extensions` - an `Extensions` instance
* `args` - an array of arguments

## Lifecycle

* `preHandler` - Lifecycle point that executes array of functions 
   in series before `handler`. Functions take spread `args` as arguments.
   Each function returns `Promise`
    * if `preHandler` array is empty execution continues with 'handler'
    * if `Promise` is rejected lifecycle breaks to final catch
    * if `Promise` is resolved execution continues with 'handler'
* `handler` - executes a `promiseFactory` function that returns `Promise`.
  Function takes spread `args` as arguments.
    * if `Promise` is rejected
        * if `postHandler` array is not empty lifecycle breaks to `postHandler` 
          with rejected error
        * if `postHandler` array is empty lifecycle breaks to final catch
    * if `Promise` is resolved
        * if `postHandler` array is not empty execution continues 
          with `postHandler` called with resolved result
        * if `postHandler` array is empty result is resolved
* `postHandler` - Lifecycle point that executes array of functions 
  in series after `handler`. Functions take response object either result 
  or error property. Each function returns `Promise`
    * if `Promise` is rejected lifecycle breaks to final catch
    * if response object contains error lifecycle breaks 
      to final catch with error
    * if response object contains result lifecycle continue with result 

