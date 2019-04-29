const joi = require('joi')

const VERSION_REGEX = /^[0-9]+[.][0-9]+[.][0-9]+[-]gke[.].+$/

function getValidation (locations) {
  const VALIDATION = joi.object().keys({
    name: joi.string().min(3).max(30).required(),
    projectId: joi.string(),
    provider: joi.string(),
    version: joi.string().regex(VERSION_REGEX),
    organizationId: joi.string().required(),
    billingAccount: joi.string().required(),
    zones: joi.array().items(joi.string()),
    description: joi.string(),
    locations: joi.array().items(joi.string().valid(locations)),
    serviceAccount: joi.string(),
    readableBuckets: joi.array().items(joi.string()),
    writeableBuckets: joi.array().items(joi.string()),
    basicAuth: joi.boolean(),
    user: joi.string(),
    password: joi.string(),
    managers: joi.number(),
    manager: joi.object().keys({
      distributed: joi.boolean(),
      network: joi.object().keys({
        authorizedCidr: joi.array().items(joi.object().keys({
          name: joi.string(),
          block: joi.string().regex(/[0-9]{1,3}[.][0-9]{1,3}[.][0-9]{1,3}[.][0-9]{1,3}/)
        }))
      })
    }),
    worker: joi.object().keys({
      cores: joi.number(),
      count: joi.number(),
      min: joi.number(),
      max: joi.number(),
      memory: joi.string().regex(/^([0-9]+)(MB|GB)$/),
      maxPerInstance: joi.number(),
      reserved: joi.boolean(),
      maintenanceWindow: joi.string().regex(/^[0-9]{2}[:][0-9]{2}([:][0-9]{2})?Z?$/),
      storage: joi.object().keys({
        ephemeral: joi.string().regex(/^([0-9]+)(MB|GB)$/),
        persistent: joi.string().regex(/^([0-9]+)(MB|GB)$/)
      }),
      network: joi.object().keys({
        range: joi.string().regex(/[0-9]{1,3}[.][0-9]{1,3}[.][0-9]{1,3}[.][0-9]{1,3}/),
        vpc: joi.string()
      })
    }),
    flags: joi.object().keys({
      alphaFeatures: joi.boolean(),
      authedNetworksOnly: joi.boolean(),
      autoRepair: joi.boolean(),
      autoScale: joi.boolean(),
      autoUpgrade: joi.boolean(),
      basicAuth: joi.boolean(),
      clientCert: joi.boolean(),
      includeDashboard: joi.boolean(),
      legacyAuthorization: joi.boolean(),
      loadBalancedHTTP: joi.boolean(),
      networkPolicy: joi.boolean(),
      privateCluster: joi.boolean(),
      serviceMonitoring: joi.boolean(),
      serviceLogging: joi.boolean()
    })
  })

  return VALIDATION
}

module.exports = getValidation
