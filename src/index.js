const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const inquire = require('./commands/inquire')
const log = require('bole')('kubeform')

class API extends EventEmitter {
  constructor (options) {
    super()
    this.config = require('./config')(options)
    this.provider = require('./provider')(this.config, this)
  }

  create (options) {
    const credFile = this.config.credFile
    if (credFile) {
      const credPath = path.resolve(credFile)
      log.info(`loading service account credentials from '${credPath}'`)
      if (fs.existsSync(credPath)) {
        options.credentials = inquire.loadTokens(credPath)
      }
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

  init (options) {
    let defaults = {}
    let data = {}

    if (options.defaults) {
      if (typeof options.defaults === 'string') {
        const defaultPath = path.resolve(options.defaults)
        if (fs.existsSync(defaultPath)) {
          defaults = inquire.loadTokens(defaultPath)
        }
      } else {
        defaults = options.defaults
      }
    }

    if (options.data) {
      if (typeof options.defaults === 'string') {
        const dataPath = path.resolve(options.data)
        if (fs.existsSync(dataPath)) {
          data = inquire.loadTokens(dataPath)
        }
      } else {
        data = options.data
      }
    }

    let mixed = Object.assign(defaults, data, options.tokens || {})
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
