const joi = require('joi')

const DEFAULTS = {
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

const MACHINES = [
  {
    name: 'n1-standard-1',
    cores: 1,
    memory: 3.75,
    perMonth: 24.2725
  },
  {
    name: 'n1-standard-2',
    cores: 2,
    memory: 7.50,
    perMonth: 48.55
  },
  {
    name: 'n1-standard-4',
    cores: 4,
    memory: 15,
    perMonth: 97.09
  },
  {
    name: 'n1-standard-8',
    cores: 8,
    memory: 30,
    perMonth: 194.18
  },
  {
    name: 'n1-standard-16',
    cores: 16,
    memory: 60,
    perMonth: 388.36
  },
  {
    name: 'n1-standard-32',
    cores: 32,
    memory: 120,
    perMonth: 776.72
  },
  {
    name: 'n1-standard-64',
    cores: 64,
    memory: 240,
    perMonth: 1553.44
  },
  {
    name: 'n1-standard-96',
    cores: 96,
    memory: 360,
    perMonth: 2330.16
  },
  {
    name: 'n1-highmem-2',
    cores: 2,
    memory: 13,
    perMonth: 60.50
  },
  {
    name: 'n1-highmem-4',
    cores: 4,
    memory: 26,
    perMonth: 121.00
  },
  {
    name: 'n1-highmem-8',
    cores: 8,
    memory: 52,
    perMonth: 242.00
  },
  {
    name: 'n1-highmem-16',
    cores: 16,
    memory: 104,
    perMonth: 484.00
  },
  {
    name: 'n1-highmem-32',
    cores: 32,
    memory: 208,
    perMonth: 968.00
  },
  {
    name: 'n1-highmem-64',
    cores: 64,
    memory: 416,
    perMonth: 1936.00
  },
  {
    name: 'n1-highmem-96',
    cores: 96,
    memory: 624,
    perMonth: 2904.12
  },
  {
    name: 'n1-highcpu-2',
    cores: 2,
    memory: 1.8,
    perMonth: 36.23
  },
  {
    name: 'n1-highcpu-4',
    cores: 4,
    memory: 3.6,
    perMonth: 72.46
  },
  {
    name: 'n1-highcpu-8',
    cores: 8,
    memory: 7.2,
    perMonth: 144.92
  },
  {
    name: 'n1-highcpu-16',
    cores: 16,
    memory: 14.4,
    perMonth: 289.84
  },
  {
    name: 'n1-highcpu-32',
    cores: 32,
    memory: 28.8,
    perMonth: 579.68
  },
  {
    name: 'n1-highcpu-64',
    cores: 64,
    memory: 57.6,
    perMonth: 1159.36
  },
  {
    name: 'n1-highcpu-96',
    cores: 96,
    memory: 86.4,
    perMonth: 1739.04
  },
  {
    name: 'n1-ultramem-40',
    cores: 40,
    memory: 938,
    perMonth: 3221.2929
  },
  {
    name: 'n1-ultramem-80',
    cores: 80,
    memory: 1922,
    perMonth: 6442.5858
  },
  {
    name: 'n1-ultramem-96',
    cores: 96,
    memory: 1433.6,
    perMonth: 5454.3070
  },
  {
    name: 'n1-ultramem-160',
    cores: 160,
    memory: 3844,
    perMonth: 12885.1716
  }
]

const REGIONS = {
  'asia-east1': ['asia-east1-a', 'asia-east1-b', 'asia-east1-c'],
  'asia-northeast1': ['asia-northeast1-a', 'asia-northeast1-b', 'asia-northeast1-c'],
  'asia-south1': ['asia-south1-a', 'asia-south1-b', 'asia-south1-c'],
  'asia-southeast1': ['asia-southeast1-a', 'asia-southeast1-b', 'asia-southeast1-c'],
  'australia-southeast1': ['australia-southeast1-a', 'australia-southeast1-b', 'australia-southeast1-c'],
  'europe-north1': ['europe-north1-a', 'europe-north1-b', 'europe-north1-c'],
  'europe-west1': ['europe-west1-b', 'europe-west1-c', 'europe-west1-d'],
  'europe-west2': ['europe-west2-a', 'europe-west2-b', 'europe-west2-c'],
  'europe-west3': ['europe-west3-a', 'europe-west3-b', 'europe-west3-c'],
  'europe-west4': ['europe-west4-a', 'europe-west4-b', 'europe-west4-c'],
  'northamerica-northeast1': ['northamerica-northeast1-a', 'northamerica-northeast1-b', 'northamerica-northeast1-c'],
  'southamerica-east1': ['southamerica-east1-a', 'southamerica-east1-b', 'southamerica-east1-c'],
  'us-central1': ['us-central1-a', 'us-central1-b', 'us-central1-c', 'us-central1-f'],
  'us-east1': ['us-east1-a', 'us-east1-b', 'us-east1-c'],
  'us-east4': ['us-east4-a', 'us-east4-b', 'us-east4-c'],
  'us-west1': ['us-west1-a', 'us-west1-b', 'us-west1-c']
}

const SIZE_REGEX = /^([0-9]+)(MB|GB)$/

const VALIDATION = joi.object().keys({
  name: joi.string().min(3).max(30).required(),
  projectId: joi.string(),
  provider: joi.string(),
  organizationId: joi.string().required(),
  billingAccount: joi.string().required(),
  zones: joi.array().items(joi.string()),
  description: joi.string(),
  locations: joi.array().items(joi.string().valid(getAllLocations())),
  serviceAccount: joi.string(),
  readableBuckets: joi.array().items(joi.string()),
  writeableBuckets: joi.array().items(joi.string()),
  version: joi.string(),
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

function getAllLocations () {
  return getAllZones()
    .concat(
      getRegions()
    )
}

function getAllZones () {
  const regions = getRegions()
  return regions.reduce((list, region) => {
    return list.concat(REGIONS[region])
  }, [])
}

function getMachineType (worker) {
  MACHINES.sort((a, b) => {
    if (a.perMonth > b.perMonth) {
      return 1
    } else if (a.perMonth < b.perMonth) {
      return -1
    }
    return 0
  })
  let machine
  let index = 0
  let memory = 1
  if (worker.memory) {
    const [, amount, units] = SIZE_REGEX.exec(worker.memory)
    memory = amount / (units.toUpperCase() === 'MB' ? 1024 : 1)
  }
  while (!machine && index < MACHINES.length - 1) {
    let type = MACHINES[index]
    if (
      type.cores >= worker.cores &&
      type.memory >= memory
    ) {
      machine = type.name
    }
    index++
  }
  return machine
}

function getRegions () {
  return Object.keys(REGIONS)
}

function getZones (region) {
  return REGIONS[region]
}

function mergeOptions (config, options) {
  const merged = Object.assign({}, DEFAULTS, config, options)
  merged.serviceAccount = `${merged.projectId || merged.name}-k8s-sa`
  return merged
}

function validateOptions (options) {
  const result = VALIDATION.validate(options)
  if (result.error) {
    throw result.error
  }
}

module.exports = function () {
  return {
    getAllLocations,
    getAllZones,
    getMachineType,
    getRegions,
    getZones,
    mergeOptions,
    validateOptions
  }
}
