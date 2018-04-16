/**
 * Puts property [name] on the instance of any object-like structure.
 * @param  {string|Symbol} name - Name of propety to add.
 * @param  {Function} fn - Function or value to put on the instance.
 * @param  {string[]} dependencies - Ensures that  all dependencies are present.
 * @returns {this} - Instance of self to allow chaining.
 */
function decorate(name, fn, dependencies) {
  if (checkExistence(this, name)) {
    throw new Error(`The decorator '${name}' has been already added!`);
  }

  if (dependencies) {
    checkDependencies(this, dependencies);
  }

  this[name] = fn;
  return this;
}

/**
 * Checks whether property is present on the instance
 * of any object or current context.
 * @param  {string|Object} _instance - Property name to check on context or instance to check upon.
 * @param  {string} [_name] - Property name to check on instance.
 * @returns {boolean} - Whether instance present or not.
 */
function checkExistence(_instance, _name) {
  let name = _name;
  let instance = _instance;

  if (!name) {
    name = _instance;
    instance = this;
  }

  return name in instance;
}

// function checkExistenceInPrototype(klass, name) {
//   return name in klass.prototype;
// }

function checkDependencies(instance, deps) {
  for (let i = 0; i < deps.length; i += 1) {
    if (!checkExistence(instance, deps[i])) {
      throw new Error(`Fastify decorator: missing dependency: '${deps[i]}'.`);
    }
  }
}

// function decorateReply(name, fn, dependencies) {
//   if (checkExistenceInPrototype(this._Reply, name)) {
//     throw new Error(`The decorator '${name}' has been already added to Reply!`);
//   }
//
//   if (dependencies) {
//     checkDependencies(this._Reply, dependencies);
//   }
//
//   this._Reply.prototype[name] = fn;
//   return this;
// }
//
// function decorateRequest(name, fn, dependencies) {
//   if (checkExistenceInPrototype(this._Request, name)) {
//     throw new Error(`The decorator '${name}' has been already added to Request!`);
//   }
//
//   if (dependencies) {
//     checkDependencies(this._Request, dependencies);
//   }
//
//   this._Request.prototype[name] = fn;
//   return this;
// }

module.exports = {
  add: decorate,
  exist: checkExistence,
  dependencies: checkDependencies,
  // TODO:
  // add code for decorating reply/request
};
