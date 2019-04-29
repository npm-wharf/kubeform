const MESSAGE = 'the cloud provider is required in order to perform this action'

class None {
  create () {
    throw new Error(MESSAGE)
  }

  getAPIVersions () {
    throw new Error(MESSAGE)
  }

  getRegions () {
    throw new Error(MESSAGE)
  }

  getZones () {
    throw new Error(MESSAGE)
  }
}

module.exports = None
