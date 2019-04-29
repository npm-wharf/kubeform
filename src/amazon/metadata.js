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

const SIZE_REGEX = /^([0-9]+)(MB|GB)$/

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

module.exports = function () {
  return {
    getMachineType
  }
}
