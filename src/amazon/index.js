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
    super(config)
    this.config = config || {}
    this.events = events || new Emitter()
    this.regions = this._generateZones(zones)
    this.project = null
    this.cidrblock = '10.0.0.0/24'
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

  async createVPC () {
    const opts = {
      CidrBlock: this.cidrblock
    }

    this.vpc = this.ec2.createVpc(opts).promise()
  }

  getAWSAPI (api, options) {
    let opts
    if (options.credentials) {
      opts = {
        accessKeyId: options.credentials.accessKeyId,
        secretAccessKey: options.credentials.secretAccessKey
      }
    }
    return new AWS[api](opts)
  }

  // in aws this is an org user, which we create, and then
  // we need to create a key for this user so that they can
  // own the subsequent things they've created
  async createProject (options) {
    options.projectId = options.projectId || options.name
    const projectId = options.projectId
    log.info(`creating project ${projectId}`)

    this.project = await this.getProject(options)
    if (!this.project) {
      const opts = {
        AccountName: projectId,
        Email: '',
        IamUserAccessToBilling: 'DENY',
        RoleName: ''
      }
      try {
        const orgsAPI = this.getAWSAPI('Organizations', options)
        const iamAPI = this.getAWSAPI('IAM', options)
        this.project = await orgsAPI.createAccount(opts).promise()
        const iamOpts = {
          UserName: this.project.AccountName
        }
        const key = await iamAPI.createAccessKey(iamOpts).promise()
        Object.assign(this.project, key)
      } catch (err) {
        const msg = `failed to create project ${projectId} with ${err.message}`
        log.fatal(msg)
        throw new Error(msg)
      }
    }
    return this.project
  }

  async getProject (options) {
    const orgsAPI = this.getAWSAPI('Organizations', options)
    const projectId = options.projectId
    const list = await orgsAPI.listAccounts({})
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
