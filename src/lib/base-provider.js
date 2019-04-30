const fs = require('fs')
const path = require('path')
const loadTokens = require('./lib/load-tokens')
const getValidation = require('./validation')

/**
 * BaseProvider for kubeform. Replaces the majority of the src/{provider}/metadata file
 * so there's no more copy/paste between providers.
 *
 * @todo google needs to be upgraded to use this
 */
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

  /**
   * Generate the zones as the Provider wants them (they are stored in the format
   * that the inquire system wants them in
   *
   * @todo unify how various parts of the system want this data stored
   * @private
   * @param {object} zones - a list of the regions and zones for those regions for a given provider
   * @return {object} zones - a Provider-useable list
   */
  _generateZones (zones) {
    return zones.reduce((acc, zone) => {
      acc[zone.region] = zone.zones.map((specifier) => `${zone.region}-${specifier}`)
      return acc
    }, {})
  }

  /**
   * Merge the config and options hashes, setting the serviceAccount name
   *
   * @param {object} config - kubeform config
   * @param {object} options - kubeform options
   * @returns {object} merged object
   */
  mergeOptions (config, options) {
    const merged = Object.assign({}, this.DEFAULTS, config, options)
    merged.serviceAccount = `${merged.projectId || merged.name}-k8s-sa`
    return merged
  }

  /**
   * Get a list of all locations from the regions
   *
   * @return {array(string)} a list of locations
   */
  getAllLocations () {
    return this.getAllZones()
      .concat(this.getRegions())
  }

  /**
   * Reduce and concatenate all regions/zones into a single list
   *
   * @returns {array(array(string))}
   */
  getAllZones () {
    const regions = this.getRegions()
    return regions.reduce((list, region) => {
      return list.concat(this.regions[region])
    }, [])
  }

  /**
   * Validate the options to ensure they are supported
   *
   * @returns {object} undefined
   */
  validateOptions (options) {
    const VALIDATION = getValidation(this.getAllLocations())
    const result = VALIDATION.validate(options, { allowUnknown: true })
    if (result.error) {
      throw result.error
    }
  }

  /**
   * Handle cred file loading from the on-disk config file if one exists
   * and then call the actual _create method
   *
   * @param {object} options
   * @returns {object} undefined
   */
  create (options) {
    const { credentials, projectId, credFile } = this.config
    // This code is trying to determine if you have creds for a user/project
    // already and to use those if you do. This logic could be cleaned up
    // a bit to make it more clear -- also fabrikatherine might pass in
    // credentials in an entirely separate way so this needs to take
    // into account for that
    if (credFile) {
      const credPath = path.resolve(credFile)
      if (fs.existsSync(credPath)) {
        options.credentials = loadTokens(credPath)
      }
    } else if (credentials) {
      options.credentials = credentials
      options.projectId = projectId
    }
    return this._create(options)
  }

  _create (options) {
    throw new Error('You must implement the _create method')
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
