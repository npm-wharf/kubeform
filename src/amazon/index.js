const Emitter = require('events')

const AWS = require('aws')
const pino = require('pino')
const log = pino({
  name: 'aws.provider',
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'
})

const BaseProvider = require('../provider-base')
const zones = require('./zones')

const EKSVersions = {
  defaultClusterVersion: '1.11.5',
  validMasterVersions: ['1.10.11', '1.11.5']
}

// A provider needs to export the following functions as a public interface:
// create, getRegions, getApiVerions, getZones
class AWSProvider extends BaseProvider {
  constructor (config, events) {
    super()
    this.config = config || {}
    this.events = events || new Emitter()
    this.regions = this._generateZones(zones)
    this.organziations = new AWS.Organizations()
    this.ec2 = new AWS.EC2()
    this.project = null
  }

  async create (opts) {
    const options = this.mergeOptions(this.config, opts)
    try {
      this.validateOptions(options)
      this.createProject(options)
      // create vpc
      // create instances in vpc
      // create eks
      // create aws buckets
    } catch (err) {
      const msg = `failed to create new EKS cluster with ${err.message}`
      log.fatal(msg)
      throw msg
    }
  }

  async createProject (options) {
    options.projectId = options.projectId || options.name
    const projectId = options.projectId
    log.info(`creating project ${projectId}`)

    this.project = await this.getProject(options)
    if (!this.project) {
      const opts = {
        AccountName: projectId,
        Email: '',
        IamUserAccessToBilling: 'false',
        RoleName: ''
      }
      try {
        this.project = await this.organizations.createAccount(opts).promise()
      } catch (err) {
        const msg = `failed to create project ${projectId} with ${err.message}`
        log.fatal(msg)
        throw new Error(msg)
      }
    }
    return this.project
  }

  async getProject (options) {
    const projectId = options.projectId
    const list = await this.organizations.listAccounts({})
    return list.accounts.find((org) => org.name === projectId)
  }

  getRegions () {
    return Object.keys(this.regions)
  }

  // So AWS does not have a way to get these via an API. Sorry buddies
  getAPIVersions () {
    return EKSVersions
  }

  getZones (region) {
    return this.regions[region]
  }
}

module.exports = AWSProvider
