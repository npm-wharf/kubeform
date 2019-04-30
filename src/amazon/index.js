const Emitter = require('events')

const AWS = require('aws')
const pino = require('pino')
const log = pino({
  name: 'aws.provider',
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info'
})

const BaseProvider = require('../lib/base-provider')
const zones = require('./zones')

const EKSVersions = {
  defaultClusterVersion: '1.11.5',
  validMasterVersions: ['1.10.11', '1.11.5']
}

/** Class for the AWS Provider */
class AWSProvider extends BaseProvider {
  /**
   * Create a new AWS Provider instance. If a secret is provided here and the
   * project already exists, that secret will be used for all subsequent API calls
   * which means the user represented by those creds will OWN the VPC/Buckets.
   *
   * If the project is new, a new access key will be generated for that new
   * project. Whatever is calling this should likely save that for later...
   * @param {object} config - kubeform configuration
   * @param {object} [config.creds]
   * @param {string} [config.creds.accessKeyId] - the access key to use for API calls
   * @param {string} [config.creds.secretAccessKey] - the secret to use for API calls
   * @param {Emitter} events - an EventEmitter instance
   */
  constructor (config, events) {
    super(config)
    this.config = config || {}
    this.events = events || new Emitter()
    this.regions = this._generateZones(zones)
    this.project = null
    this.cidrblock = '10.0.0.0/24'
  }

  /**
   * Create a new EKS cluster. This will create a new project if one does
   * not yet exist, and then generate A VPC, EC2 instances in that VPC
   * and and EKS instance out of them, along with the appropriate storage buckets
   *
   * @private
   * @param {object} opts - options for creation.
   * @emits prerequisites-created
   * @returns {object} - undefined
   */
  async _create (opts) {
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

  /**
   * Return an instantiated AWS API with the provided credentials (or
   * if not provided, use the default credentials from the environment
   *
   * @private
   * @param {string} api - the API to instantiate
   * @param {object} creds
   * @param {string} creds.accessKeyId - the access key
   * @param {string} creds.secretAccessKey - the secret for the access key
   * @returns {object} AWS API instance
   */
  getAWSAPI (api, creds) {
    let opts
    if (creds) {
      opts = {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey
      }
    }
    return new AWS[api](opts)
  }

  /**
   * Create a VPC instance
   *
   * @private
   * @returns {object} undefined
   */
  async createVPC () {
    const opts = {
      CidrBlock: this.cidrblock
    }
    const ec2API = this.getAWSAPI('EC2', this.project.creds)
    this.vpc = await ec2API.createVpc(opts).promise()
  }

  /**
   * Create a new project. Although, in AWS terminology we're creating a user
   * under an organziation, and that user will own all the resources created
   * for all the clusters under that user.
   * This will attempt to see if a user already exists by this name, and use
   * that user -- if this is the case the accessKey returned by creating the
   * user originally **must** be supplied as the `creds` key on the call to
   * `AWSProvider#create`
   *
   * @private
   * @param {object} options
   * @param {string} [options.accessKeyId] - the access key
   * @param {string} [options.secretAccessKey] - the secret for the access key
   * @param {string} [options.projectId] - a unique identifier for this user
   * @param {string} [options.name] - a unique identifier for this user
   * @returns {object} - undefined
   */
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
        this.project.creds = {
          accessKeyId: key.AccessKeyId,
          secretAccessKey: key.SecretAccessKey
        }
      } catch (err) {
        const msg = `failed to create project ${projectId} with ${err.message}`
        log.fatal(msg)
        throw new Error(msg)
      }
    }
    return this.project
  }

  /**
   * Get a user (if they already exist)
   *
   * @private
   * @param {object} options
   * @param {string} [options.accessKeyId] - the access key
   * @param {string} [options.secretAccessKey] - the secret for the access key
   * @returns {undefined|account}
   */
  async getProject (options) {
    const orgsAPI = this.getAWSAPI('Organizations', options)
    const projectId = options.projectId
    const list = await orgsAPI.listAccounts({})
    const acct = list.accounts.find((org) => org.name === projectId)
    if (acct) {
      acct.creds = options.creds
    }
    return acct
  }

  /**
   * Get a list of regions for this service
   *
   * @returns {array(string)} region list
   */
  getRegions () {
    return Object.keys(this.regions)
  }

  /**
   * Get a list of Kubernetes versions. AWS does _NOT_ have a way to automate
   * this as of 30-04-2019 so this is hardcoded in this file.
   *
   * @todo automate this if possible
   * @returns {object} AWS EKS versions
   */
  getAPIVersions () {
    return EKSVersions
  }

  /**
   * Get a list of zones for a given region
   *
   * @param {string} region - the region (as returned from `AWSProvider#getRegions`)
   * @returns {array(string)}  a list of zones for that region
   */
  getZones (region) {
    return this.regions[region]
  }
}

module.exports = AWSProvider
