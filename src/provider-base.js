const getValidation = require('./validation')

class BaseProvider {
  constructor (options) {
    this.DEFAULTS = {
      managers: 1,
      manager: {
        distributed: false
      },
      worker: {
        cores: 2,
        count: 3,
        memory: '13GB',
        maxPerInstance: 9,
        reserved: true,
        storage: {
          ephemeral: '0GB',
          persistent: '100GB'
        }
      },
      flags: {
        alphaFeatures: false,
        authedNetworksOnly: false,
        autoRepair: true,
        autoScale: false,
        autoUpgrade: false,
        basicAuth: true,
        clientCert: true,
        includeDashboard: false,
        legacyAuthorization: false,
        loadBalanceHTTP: true,
        maintenanceWindow: '08:00:00Z',
        networkPolicy: true,
        privateCluster: false,
        serviceMonitoring: false,
        serviceLogging: false
      }
    }
  }

  _generateZones (zones) {
    return zones.reduce((acc, zone) => {
      acc[zone.region] = zone.zones.map((specifier) => `${zone.region}-${specifier}`)
      return acc
    }, {})
  }

  mergeOptions (config, options) {
    const merged = Object.assign({}, this.DEFAULTS, config, options)
    merged.serviceAccount = `${merged.projectId || merged.name}-k8s-sa`
    return merged
  }

  getAllLocations () {
    return this.getAllZones()
      .concat(this.getRegions())
  }

  getAllZones () {
    const regions = this.getRegions()
    return regions.reduce((list, region) => {
      return list.concat(this.regions[region])
    }, [])
  }

  validateOptions (options) {
    const VALIDATION = getValidation(this.getAllLocations())
    const result = VALIDATION.validate(options, { allowUnknown: true })
    if (result.error) {
      throw result.error
    }
  }

  create () {
    throw new Error('You must implement the create method')
  }

  getRegions () {
    throw new Error('You must implement the getRegions method')
  }

  getAPIVersions () {
    throw new Error('You must implement the getAPIVersions method')
  }

  getZones () {
    throw new Error('You must implement the getZones method')
  }
}

module.exports = BaseProvider
