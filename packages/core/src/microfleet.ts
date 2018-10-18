import Microfleet, * as MicrofleetES from './'

module.exports = exports = Microfleet
Object.assign(exports, MicrofleetES)

export { Microfleet }
export default Microfleet

// if there is no parent module we assume it's called as a binary
if (!module.parent) {
  const mservice = new Microfleet()
  mservice
    .connect()
    .catch((err: Error) => {
      mservice.log.fatal('Failed to start service', err)
      setImmediate(() => { throw err })
    })
}
