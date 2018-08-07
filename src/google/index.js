const Resource = require('@google-cloud/resource')
const container = require('@google-cloud/container')
const Storage = require('@google-cloud/storage')
const Iam = require('./iam')
const Provider = require('./provider')

module.exports = function (config, events) {
  const orgId = process.env.GOOGLE_ORGANIZATION_ID
  const authFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
  config.organizationId = orgId
  config.billingAccount = process.env.GOOGLE_BILLING_ID
  const resource = Resource({
    projectId: orgId,
    keyFileName: authFile
  })
  const iam = Iam({
    projectId: orgId,
    keyFileName: authFile
  })
  const storage = Storage({
    projectId: orgId,
    keyFileName: authFile
  })
  const client = new container.v1.ClusterManagerClient({
    keyFileName: authFile
  })
  return Provider(config, resource, iam, client, storage, events)
}
