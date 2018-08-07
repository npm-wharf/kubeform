require('./setup')
const metadata = require('../src/google/metadata')()

describe('Google Metadata', function () {
  it('it should return all locations flattened', function () {
    return metadata.getAllLocations()
      .should.eql([
        'asia-east1-a',
        'asia-east1-b',
        'asia-east1-c',
        'asia-northeast1-a',
        'asia-northeast1-b',
        'asia-northeast1-c',
        'asia-south1-a',
        'asia-south1-b',
        'asia-south1-c',
        'asia-southeast1-a',
        'asia-southeast1-b',
        'asia-southeast1-c',
        'australia-southeast1-a',
        'australia-southeast1-b',
        'australia-southeast1-c',
        'europe-north1-a',
        'europe-north1-b',
        'europe-north1-c',
        'europe-west1-b',
        'europe-west1-c',
        'europe-west1-d',
        'europe-west2-a',
        'europe-west2-b',
        'europe-west2-c',
        'europe-west3-a',
        'europe-west3-b',
        'europe-west3-c',
        'europe-west4-a',
        'europe-west4-b',
        'europe-west4-c',
        'northamerica-northeast1-a',
        'northamerica-northeast1-b',
        'northamerica-northeast1-c',
        'southamerica-east1-a',
        'southamerica-east1-b',
        'southamerica-east1-c',
        'us-central1-a',
        'us-central1-b',
        'us-central1-c',
        'us-central1-f',
        'us-east1-a',
        'us-east1-b',
        'us-east1-c',
        'us-east4-a',
        'us-east4-b',
        'us-east4-c',
        'us-west1-a',
        'us-west1-b',
        'us-west1-c',
        'asia-east1',
        'asia-northeast1',
        'asia-south1',
        'asia-southeast1',
        'australia-southeast1',
        'europe-north1',
        'europe-west1',
        'europe-west2',
        'europe-west3',
        'europe-west4',
        'northamerica-northeast1',
        'southamerica-east1',
        'us-central1',
        'us-east1',
        'us-east4',
        'us-west1'
      ])
  })

  it('should return all regions', function () {
    return metadata.getRegions()
      .should.eql([
        'asia-east1',
        'asia-northeast1',
        'asia-south1',
        'asia-southeast1',
        'australia-southeast1',
        'europe-north1',
        'europe-west1',
        'europe-west2',
        'europe-west3',
        'europe-west4',
        'northamerica-northeast1',
        'southamerica-east1',
        'us-central1',
        'us-east1',
        'us-east4',
        'us-west1'
      ])
  })

  it('should return all zones', function () {
    return metadata.getAllZones()
      .should.eql([
        'asia-east1-a',
        'asia-east1-b',
        'asia-east1-c',
        'asia-northeast1-a',
        'asia-northeast1-b',
        'asia-northeast1-c',
        'asia-south1-a',
        'asia-south1-b',
        'asia-south1-c',
        'asia-southeast1-a',
        'asia-southeast1-b',
        'asia-southeast1-c',
        'australia-southeast1-a',
        'australia-southeast1-b',
        'australia-southeast1-c',
        'europe-north1-a',
        'europe-north1-b',
        'europe-north1-c',
        'europe-west1-b',
        'europe-west1-c',
        'europe-west1-d',
        'europe-west2-a',
        'europe-west2-b',
        'europe-west2-c',
        'europe-west3-a',
        'europe-west3-b',
        'europe-west3-c',
        'europe-west4-a',
        'europe-west4-b',
        'europe-west4-c',
        'northamerica-northeast1-a',
        'northamerica-northeast1-b',
        'northamerica-northeast1-c',
        'southamerica-east1-a',
        'southamerica-east1-b',
        'southamerica-east1-c',
        'us-central1-a',
        'us-central1-b',
        'us-central1-c',
        'us-central1-f',
        'us-east1-a',
        'us-east1-b',
        'us-east1-c',
        'us-east4-a',
        'us-east4-b',
        'us-east4-c',
        'us-west1-a',
        'us-west1-b',
        'us-west1-c'
      ])
  })

  it('should return appropriate machine types', function () {
    metadata.getMachineType({
      memory: '8GB',
      cores: 2
    }).should.eql('n1-highmem-2')

    metadata.getMachineType({
      memory: '18GB',
      cores: 32
    }).should.eql('n1-highcpu-32')

    metadata.getMachineType({
      memory: '18GB',
      cores: 32
    }).should.eql('n1-highcpu-32')

    metadata.getMachineType({
      memory: '64GB',
      cores: 32
    }).should.eql('n1-standard-32')
  })

  it('should merge and validate options', function () {
    const opts = metadata.mergeOptions({}, {name: 'test'})
    opts.should.eql({
      managers: 1,
      name: 'test',
      serviceAccount: 'test-k8s-sa',
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
    })

    expect(() => metadata.validateOptions({}, {}))
      .to.throw(
        'child "name" fails because ["name" is required]'
      )
  })
})
