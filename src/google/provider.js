const log = require('pino')({name: 'kubeform.google', ...require('../pino-config')})
const meta = require('./metadata')()
const uuid = require('uuid')
const SIZE_REGEX = /^([0-9]+)(MB|GB)$/
const Promise = require('bluebird')

const BASELINE_SERVICES = [
  'servicemanagement.googleapis.com',
  'cloudapis.googleapis.com'
]

const SUPPORTING_SERVICES = [
  'compute.googleapis.com',
  'container.googleapis.com',
  'storage-component.googleapis.com',
  'storage-api.googleapis.com'
]

function addBinding (roles, newRole, assignment) {
  let added = false
  let exists = false
  let bindings = roles.bindings
  let i = 0
  while (i < bindings.length) {
    const binding = bindings[i]
    if (binding.role === newRole) {
      if (binding.members.indexOf(assignment) < 0) {
        binding.members.push(assignment)
        added = true
      } else {
        exists = true
      }
    }
    i++
  }
  if (!added && !exists) {
    roles.bindings.push({
      role: newRole,
      members: [ assignment ]
    })
    added = true
  }
  return added ? roles : undefined
}

async function checkCluster (client, options) {
  // if no operation exists, it is because the cluster already existed
  // and the create step was skipped
  if (!options.operation) {
    return
  }
  let pause = 5000
  let done = false
  const request = {
    projectId: options.projectId,
    zone: options.operation.zone,
    operationId: options.operation.name
  }
  do {
    const [result] = await client.getOperation(request)
    log.info(`cluster status is ${result.status}`)
    if (
      result.status === undefined ||
      result.status === 'PROVISIONING' ||
      result.status === 'RECONCILING' ||
      result.status === 'STATUS_UNSPECIFIED' ||
      result.status === 'RUNNING'
    ) {
      await wait(pause)
      pause *= 1.5
      if (pause > 60000) {
        pause = 60000
      }
    } else {
      done = true
    }
  } while (!done)
}

async function describeCluster (client, options) {
  const request = {
    projectId: options.projectId,
    zone: options.zones[ 0 ],
    clusterId: options.name
  }
  try {
    log.info(`checking for existing cluster '${options.name}'`)
    const [ cluster ] = await client.getCluster(request)
    log.info(`cluster status is ${cluster.status}`)
    return cluster
  } catch (e) {
    const msg = `failed to get cluster details for project '${options.projectId}' cluster '${options.name}' with error: ${e.message}. If this is a new cluster, this error may be safely ignored.`
    log.warn(msg)
    return false
  }
}

async function create (resource, cloud, client, storage, events, config, opts) {
  const options = meta.mergeOptions(config, opts)
  meta.validateOptions(options)

  const { response } = await createProject(resource, options)
  options.projectNumber = response.projectNumber

  await enableServices(cloud, options, BASELINE_SERVICES)
  await fixBilling(cloud, options)
  await enableServices(cloud, options, SUPPORTING_SERVICES)
  await createClusterService(cloud, options)

  if (!options.credentials) {
    options.credentials = await getAccountCredentials(cloud, options)
  } else {
    log.info(`using provided service account credentials`)
  }

  await setRoles(cloud, options)

  events.emit('prerequisites-created', {
    provider: 'gke',
    prerequisites: [
      'project-created',
      'service-apis-enabled',
      'billing-associated',
      'service-account-created',
      'account-credentials-acquired',
      'cloud-roles-assigned'
    ]
  })

  await grantBucketAccess(storage, options)

  events.emit('bucket-permissions-set', {
    readAccess: [ options.readableBuckets ],
    writeAccess: [ options.writableBuckets ]
  })
  await createCluster(client, options)

  events.emit('cluster-initialized', {
    kubernetesCluster: getClusterConfig(options)
  })

  await checkCluster(client, options)
  let { endpoint } = await getClusterDetails(client, options)
  options.masterEndpoint = endpoint

  return options
}

async function createCluster (client, options) {
  const existing = await describeCluster(client, options)
  if (existing) {
    options.username = existing.masterAuth.username
    options.password = existing.masterAuth.password
    return options
  }
  const seconds = 15
  log.info(`creating Kubernetes cluster for project ${options.projectId}`)
  const config = getClusterConfig(options)
  return client.createCluster(config)
    .then(
      result => {
        options.operation = result[0]
        return options
      },
      async err => {
        if (err.message.indexOf('wait a few minutes') >= 0) {
          log.warn(`failed to provision cluster due to race conditions in Google API initialization. Trying again in ${seconds} seconds ...`)
          await wait(seconds * 1000)
          return createCluster(client, options)
        } else {
          const msg = `failed to instantiate cluster with ${err.message}`
          log.error(msg)
          throw new Error(msg)
        }
      }
    )
}

async function createProject (resource, options) {
  options.projectId = options.projectId || options.name
  const projectId = options.projectId
  log.info(`creating project ${projectId}`)
  const project = await getProject(resource, options)
  if (project) {
    log.info(`project ${projectId} already exists, skipping creation step`)
    return Promise.resolve({
      response: project.metadata
    })
  }
  return resource.createProject(
    projectId,
    {
      name: projectId,
      parent: {
        type: 'organization',
        id: options.organizationId
      }
    }
  ).then(
    ([proj, op]) => {
      return op.promise()
        .then(resp => {
          return {project: proj, response: resp[0].response}
        })
    }
  ).catch(
    err => {
      const msg = `failed to create project ${projectId} for organization ${options.organizationId} with ${err.message}`
      log.error(msg)
      throw new Error(msg)
    }
  )
}

function createClusterService (cloud, options) {
  log.info(`creating service account for project ${options.projectId}`)
  return cloud.createServiceAccount(
    options.projectId,
    options.serviceAccount,
    'kubernetes cluster service account'
  ).then(
    (body) => {
      if (body.email) {
        options.serviceAccount = body.email
      }
      return body
    },
    err => {
      const msg = `failed to create cluster service ${options.serviceAccount} with ${err.message}`
      log.error(msg)
      throw new Error(msg)
    }
  )
}

async function enableServices (cloud, options, services) {
  const enabled = await cloud.getEnabledServices(options.projectId)
  const newServices = services.filter(service => !enabled.includes(service))
  if (newServices.length === 0) {
    log.info(`no new services to add for project ${options.projectId}`)
    return
  }
  log.info(`enabling services ${newServices.join(', ')} for project ${options.projectId}`)
  return Promise.mapSeries(newServices, service => cloud.enableService(options.projectId, service))
}

function fixBilling (cloud, options) {
  log.info(`associating billing account with project ${options.projectId}`)
  return cloud.assignBilling(options.projectId, options.billingAccount)
    .catch(
      err => {
        const msg = `failed to associate billing with account ${options.serviceAccount} with ${err.message}`
        log.error(msg)
        throw new Error(msg)
      }
    )
}

function getAccountCredentials (cloud, options) {
  log.info(`acquiring service account credentials for project ${options.projectId}`)
  return cloud.createCredentials(
    options.projectId,
    options.serviceAccount
  ).then(
    credentials => {
      return credentials
    },
    err => {
      const msg = `failed to get account credentials for ${options.serviceAccount} with ${err.message}`
      log.error(msg)
      throw new Error(msg)
    }
  )
}

function getBucketPolicy (bucket, options) {
  log.info(`getting bucket access for project ${options.projectId}`)
  return bucket.iam.getPolicy()
    .then(
      data => {
        return data[0]
      },
      err => {
        const msg = `failed to get roles for ${bucket.name} with ${err.message}`
        log.error(msg)
        throw new Error(msg)
      }
    )
}

function getClusterConfig (options) {
  const manager = options.manager || {}
  manager.network = manager.network || {}
  const config = {
    projectId: options.projectId,
    zone: options.zones[0],
    cluster: {
      name: options.name,
      description: options.description,
      nodePools: [
        getNodeConfig(options)
      ],
      network: options.worker.network ? options.worker.network.vpc : undefined,
      clusterIpv4Cidr: options.worker.network ? options.worker.network.range : undefined,
      initialClusterVersion: options.version,
      locations: options.zones,
      addonsConfig: {
        httpLoadBalancing: {
          disabled: options.flags.loadBalancedHTTP !== true
        },
        horizontalPodAutoscaling: {
          disabled: options.flags.autoScale !== true
        },
        kubernetesDashboard: {
          disabled: options.flags.includeDashboard !== true
        },
        networkPolicyConfig: {
          disabled: options.flags.networkPolicy !== true
        }
      },
      legacyAbac: {
        enabled: options.flags.legacyAuthorization === true
      },
      networkPolicy: {
        enabled: options.flags.networkPolicy,
        provider: 'CALICO'
      },
      managedAuthorizedNetworksConfig: {
        enabled: options.manager.network.authorizedCidr !== undefined,
        cidrBlocks: options.manager.network.authorizedCidr ? options.manager.network.authorizedCidr.map(x => {
          return {
            displayName: x.name,
            cidrBlock: x.block
          }
        }) : []
      },
      maintenancePolicy: {
        window: {
          dailyMaintenanceWindow: {
            startTime: options.worker.maintenanceWindow
          }
        }
      }
    }
  }
  config.cluster.masterAuth = {
    clientCertificateConfig: {
      issueClientCertificate: options.flags.clientCert
    }
  }
  if (options.flags.basicAuth) {
    config.cluster.masterAuth.username = options.user
    config.cluster.masterAuth.password = options.password || uuid.v4()
  }
  if (options.flags.serviceMonitoring === false) {
    config.cluster.monitoringService = 'none'
  }
  if (options.flags.serviceLogging === false) {
    config.cluster.loggingService = 'none'
  }
  return config
}

async function getClusterDetails (client, options) {
  const cluster = await describeCluster(client, options)
  return cluster || { endpoint: undefined }
}

function getNodeConfig (options) {
  let worker = options.worker
  let persistent = 0
  if (worker.storage.persistent) {
    const [, size, units] = SIZE_REGEX.exec(worker.storage.persistent)
    if (units.toUpperCase() !== 'GB') {
      persistent = size / 1024
    } else {
      persistent = size
    }
  }
  const config = {
    config: {
      machineType: meta.getMachineType(worker),
      serviceAccount: options.serviceAccount,
      diskSizeGb: persistent,
      imageType: 'COS',
      localSsdCount: 0,
      preemptible: worker.reserved !== true,
      workloadMetadataConfig: {
        nodeMetadata: 'SECURE'
      },
      oauthScopes: [
        'https://www.googleapis.com/auth/compute',
        'https://www.googleapis.com/auth/devstorage.read_only'
      ]
    },
    initialNodeCount: options.worker.count,
    name: 'default-pool'
  }
  if (options.flags) {
    config.management = {
      autoRepair: options.flags.autoRepair,
      autoUpgrade: options.flags.autoUpgrade
    }
    if (options.flags.autoScale && options.worker.min && options.worker.max) {
      config.autoscaling = {
        enabled: true,
        maxNodeCount: options.worker.max,
        minNodeCount: options.worker.min
      }
    }
  }
  return config
}

function getProject (resource, options) {
  return resource.getProjects()
    .then(
      results => {
        const projects = results[0]
        let match
        while (projects.length > 0) {
          const project = projects.pop()
          if (project.id === options.projectId) {
            match = project
            break
          }
        }
        return match
      },
      err => {
        log.error(`failed to get a project list to check for project ${options.projectId} existence with ${err.message}`)
        return undefined
      }
    )
}

async function setBucketAccess (bucket, options, newRoles, account) {
  log.info(`setting bucket access for project ${options.projectId}`)
  const assignment = `serviceAccount:${account}`
  for (let i = 0; i < newRoles.length; i++) {
    const newRole = newRoles[i]
    const roles = await getBucketPolicy(bucket, options)
    const change = addBinding(roles, newRole, assignment)
    if (change) {
      await setBucketPolicy(bucket, account, newRole, change)
    }
  }
}

function setBucketPolicy (bucket, account, newRole, roles) {
  return bucket.iam.setPolicy(roles)
    .then(() => {
      return roles
    })
    .catch(err => {
      const msg = `failed to grant ${newRole} to ${account} with ${err.message}`
      log.error(msg)
      throw new Error(msg)
    })
}

function grantBucketAccess (storage, options) {
  log.info(`granting bucket access for project ${options.projectId}`)
  const readable = options.readableBuckets || []
  const readPromises = readable.map(bucketName => {
    const bucket = storage.bucket(bucketName)
    return setBucketAccess(
      bucket,
      options,
      [
        'roles/storage.objectViewer'
      ],
      options.serviceAccount
    )
  })
  const writeable = options.writeableBuckets || []
  const writePromises = writeable.map(bucketName => {
    const bucket = storage.bucket(bucketName)
    return setBucketAccess(
      bucket,
      options,
      [
        'role/storage.legacyBucketWriter'
      ],
      options.serviceAccount
    )
  })

  return Promise.all(
    [].concat(readPromises, writePromises)
  )
}

function setRoles (cloud, options) {
  log.info(`setting service account roles ${options.projectId}`)
  return cloud.assignRoles(
    options.projectId,
    'serviceAccount',
    options.serviceAccount,
    [
      'roles/logging.privateLogViewer',
      'roles/monitoring.metricWriter',
      'roles/monitoring.viewer',
      'roles/storage.admin',
      'roles/storage.objectAdmin',
      'roles/storage.objectCreator',
      'roles/storage.objectViewer'
    ]
  ).then(
    null,
    err => {
      const msg = `failed to assign roles to cluster service ${options.serviceAccount} with ${err.message}`
      log.error(msg)
      throw new Error(msg)
    }
  )
}

function wait (ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

module.exports = function (config, resource, cloud, client, storage, events) {
  return {
    create: create.bind(null, resource, cloud, client, storage, events, config),
    createCluster: createCluster.bind(null, client),
    createProject: createProject.bind(null, resource),
    createClusterService: createClusterService.bind(null, cloud),
    describeCluster: describeCluster,
    fixBilling: fixBilling.bind(null, cloud),
    getAccountCredentials: getAccountCredentials.bind(null, cloud),
    getClusterConfig,
    getClusterDetails,
    getNodeConfig,
    getRegions: meta.getRegions,
    getZones: meta.getZones,
    getAPIVersions: cloud.getAPIVersions.bind(cloud),
    grantBucketAccess: grantBucketAccess.bind(null, storage),
    setRoles: setRoles.bind(null, cloud)
  }
}
