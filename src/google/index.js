const Resource = require('@google-cloud/resource')
const container = require('@google-cloud/container')
const Storage = require('@google-cloud/storage')
const Cloud = require('./api')
const Provider = require('./provider')

module.exports = function (config, events) {
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
  return Provider(config, resource, cloud, client, storage, events)
}
