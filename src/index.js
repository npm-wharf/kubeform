const config = require('./config')
const EventEmitter = require('events')

class API extends EventEmitter {
  constructor () {
    super()
    this.provider = require('./provider')(config, this)
  }

  create (options) {
    return this.provider.create(options)
      .then(
        () => options
      )
  }

  getRegions () {
    return this.provider.getRegions()
  }

  getZones (region) {
    return this.provider.getZones(region)
  }
}

const api = new API()
module.exports = api
