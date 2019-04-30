const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const loadTokens = require('./lib/load-tokens')
const log = require('pino')({ name: 'kubeform', level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info' })
const config = require('./config')
const provider = require('./provider')

/**
 * @todo this should be merged with the BaseProvider class -- there's no reason
 * to have this separate. The `src/provider.js` file would become the index.js
 * and just return the correct provider based on the desired cloud
 */
class API extends EventEmitter {
  constructor (options) {
    super()
    this.config = config(options)
    const Provider = provider(this.config)
    this.provider = new Provider(this.config, this)
  }

  create (options) {
    const { credentials, projectId, credFile } = this.config
    // This code is trying to determine if you have creds for a user/project
    // already and to use those if you do. This logic could be cleaned up
    // a bit to make it more clear
    if (credFile) {
      const credPath = path.resolve(credFile)
      log.info(`loading service account credentials from '${credPath}'`)
      if (fs.existsSync(credPath)) {
        options.credentials = loadTokens(credPath)
      }
    } else if (credentials) {
      options.credentials = credentials
      options.projectId = projectId
    }
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

  /**
   * @todo this is only used by the `initiqlize` command and does not
   * use `this` or involve any specific provider -- this likely can be moved
   * into another file (like an entry point for the init stuff).
   *
   * The only reason the init stuff is in the same project as provision is
   * i assume since the output of init is what the input for the token file is
   * for provision, and the fact that some of the metadata about the cloud
   * instances (zones, kubernetes versions, etc) is shared between them.
   *
   * But, ideally this shouldn't be conflated with the provisioning stuff
   * in the slightest...
   */
  init (options) {
    let defaults = {}
    let data = {}

    if (options.defaults) {
      if (typeof options.defaults === 'string') {
        const defaultPath = path.resolve(options.defaults)
        if (fs.existsSync(defaultPath)) {
          defaults = loadTokens(defaultPath)
        }
      } else {
        defaults = options.defaults
      }
    }

    if (options.data) {
      if (typeof options.defaults === 'string') {
        const dataPath = path.resolve(options.data)
        if (fs.existsSync(dataPath)) {
          data = loadTokens(dataPath)
        }
      } else {
        data = options.data
      }
    }

    let mixed = Object.assign({}, defaults, data, options.tokens)
    const missing = REQUIRED_FIELDS.reduce((missing, required) => {
      let obj = mixed
      if (required.indexOf('.')) {
        let levels = required.split('.')
        while (levels.length >= 2) {
          let next = levels.shift()
          obj = obj ? obj[ next ] : undefined
        }
        let last = levels.shift()
        if (!obj || obj[ last ] === undefined) {
          missing.push(required)
        } else {
          changeType(obj, last)
        }
      } else {
        if (obj[ required ] === undefined) {
          missing.push(required)
        }
        changeType(obj, required)
      }
      return missing
    }, [])
    if (missing.length) {
      const err = new Error('missing required fields')
      err.required = missing
      throw err
    } else {
      return mixed
    }
  }
}

module.exports = API

/**
 * @todo this should probably just use joi to validate the input data
 * rather than coercing it with this stuff.
 */
function changeType (obj, key) {
  const type = FIELD_TYPES[ key ]
  if (obj[ key ] === 'null') {
    delete obj[ key ]
  }
  if (type) {
    switch (type) {
      case 'array':
        if (obj[ key ]) {
          obj[ key ] = [ obj[ key ] ]
        } else {
          obj[ key ] = []
        }
        break
      case 'boolean':
        obj[ key ] = obj[ key ] === 'true' || obj[ key ] === true
        break
      case 'number':
        obj[ key ] = Number.parseInt(obj[ key ])
        break
    }
  }
}

// I don't know why these are listed here and not part of the joi validation
// that happens when you try to actually provision something
const REQUIRED_FIELDS = [
  'name', 'description', 'projectId', 'zones', 'version', 'basicAuth',
  'user', 'password', 'organizationId', 'billingAccount',
  'serviceAccount', 'readableBuckets', 'writeableBuckets',
  'managers', 'manager.distributed',
  'worker.cores', 'worker.memory', 'worker.count', 'worker.min',
  'worker.max', 'worker.maxPerInstance', 'worker.reserved',
  'worker.storage.ephemeral', 'worker.storage.persistent',
  'worker.network.range', 'worker.network.vpc', 'worker.maintenanceWindow',
  'flags.alphaFeatures', 'flags.authedNetworksOnly',
  'flags.autoRepair', 'flags.autoScale', 'flags.autoUpgrade',
  'flags.basicAuth', 'flags.clientCert', 'flags.includeDashboard',
  'flags.legacyAuthorization', 'flags.loadBalancedHTTP',
  'flags.networkPolicy', 'flags.privateCluster',
  'flags.serviceMonitoring', 'flags.serviceLogging'
]

// Again why isn't this a joi schema -- if the data has to match these types/values
// doing this via joi is much better idea
const FIELD_TYPES = {
  distributed: 'boolean',
  cores: 'number',
  count: 'number',
  min: 'number',
  max: 'number',
  maxPerInstance: 'number',
  reserved: 'boolean',
  alphaFeatures: 'boolean',
  authedNetworksOnly: 'boolean',
  autoRepair: 'boolean',
  autoScale: 'boolean',
  autoUpgrade: 'boolean',
  basicAuth: 'boolean',
  clientCert: 'boolean',
  includeDashboard: 'boolean',
  legacyAuthorization: 'boolean',
  loadBalancedHTTP: 'boolean',
  networkPolicy: 'boolean',
  privateCluster: 'boolean',
  serviceMonitoring: 'boolean',
  serviceLogging: 'boolean',
  readableBuckets: 'array',
  writeableBuckets: 'array'
}
