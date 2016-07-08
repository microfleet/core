function router(route, request, callback, service) {
  const validator = service.validator;
  const action = service.router.routes._all[route];

  return validator.validate(route, request.params)
    .then(sanitizedParams => {
      request.params = sanitizedParams;

      return [request, service]
    })
    .spread(action.handler)
    .asCallback((error, result) => {
      if (error) {
        return callback(error);
      }

      return callback(null, result);
    });
}

module.exports = router;



//return this.validate(socket, context, callback).bind(this)
//  .then(sanitizedParams => {
//    context.params = sanitizedParams;
//
//    return [socket, context, callback];
//  })
//  .spread(this.allowed)
//  .then(isAllowed => {
//    if (isAllowed === true) {
//      return [socket, context, callback];
//    }
//
//    return Promise.reject(new Errors.NotPermittedError(this.constructor.actionName));
//  })
//  .spread(this.handler)
//  .asCallback((error, result) => {
//    context = null;
//
//    if (error) {
//      switch (error.constructor) {
//        case Errors.ValidationError:
//        case Errors.NotPermittedError:
//        case Errors.NotFoundError:
//          return callback(error);
//        default:
//          this.application.log.error(error);
//          return callback(new Errors.Error('Something went wrong'));
//      }
//    }
//
//    return callback(null, result);
//  });
