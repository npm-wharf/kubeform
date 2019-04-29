const Resource = require('@google-cloud/resource')
const container = require('@google-cloud/container')
const Storage = require('@google-cloud/storage')
const Cloud = require('./api')
const provider = require('./provider')

// Shim the google provider into a class so it'll be easier to mimic the
// AWS structure later on. This is just a pass through for now
class GoogleProvider {
  constructor (config, events) {
    const resource = Resource({
      projectId: config.organizationId,
      keyFileName: config.authFile
    })
    const cloud = Cloud({
      projectId: config.organizationId,
      keyFileName: config.authFile
    })
    const storage = Storage({
      projectId: config.organizationId,
      keyFileName: config.authFile
    })
    const client = new container.v1.ClusterManagerClient({
      keyFileName: config.authFile
    })
    this.provider = provider(config, resource, cloud, client, storage, events)
  }

  create (options) {
    return this.provider.create(options)
  }

  getRegions () {
    return this.provider.getRegions()
  }

  getAPIVersions (projectId, zone) {
    return this.provider.getAPIVersions(projectId, zone)
  }

  getZones (region) {
    return this.provider.getZones(region)
  }
}

module.exports = GoogleProvider
