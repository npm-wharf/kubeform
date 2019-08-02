require('./setup')
const Provider = require('../src/google/provider')
const meta = require('../src/google/metadata')()
const EventEmitter = require('events')

const resource = {
  createProject: () => {},
  getProjects: () => {}
}

const cloud = {
  getRoles: () => {},
  assignBilling: () => {},
  assignRoles: () => {},
  createCredentials: () => {},
  createServiceAccount: () => {},
  enableService: () => {},
  getEnabledServices: () => ['cloudapis.googleapis.com'],
  getAPIVersions: () => {}
}

const clusters = {
  createCluster: () => {},
  getCluster: () => {},
  getOperation: () => {}
}

const Storage = (b) => ({
  bucket: () => b
})

const bucket = {
  iam: {
    getPolicy: () => {},
    setPolicy: () => {}
  }
}

describe('Google Provider', function () {
  let clusterConfiguration
  let clusterOptions
  let clusterCreated
  let roles
  let finalRoles
  let initialAccessRoles
  let initialRolesSet
  let finalAccessRoles
  before(function () {
    clusterOptions = {
      name: 'npme-test',
      clusterName: 'npme-test',
      user: 'admin',
      password: 'admin', // somewhere, a infosec professional is screaming
      projectId: 'test-project',
      billingAccount: 'fake-billing-account-id',
      organizationId: 'my-org',
      serviceAccount: 'test-service-account',
      readableBuckets: ['setup'],
      zones: ['us-central1-a'],
      version: '1.8.1-gke.1',
      description: 'a test cluster',
      worker: {
        cores: 4,
        count: 3,
        min: 3,
        max: 6,
        memory: '16GB',
        reserved: true,
        storage: {
          persistent: '120GB'
        },
        maintenanceWindow: '08:00'
      },
      manager: {
        network: {
          authorizedCidr: [
            { name: 'one', block: '192.168.1.0/24' },
            { name: 'two', block: '192.168.2.0/24' }
          ]
        }
      },
      flags: {
        basicAuth: true,
        clientCert: true,
        loadBalancedHTTP: true,
        autoScale: true,
        autoUpgrade: true,
        autoRepair: true,
        includeDashboard: false,
        networkPolicy: true,
        legacyAuthorization: false
      }
    }
    clusterConfiguration = {
      projectId: 'test-project',
      zone: 'us-central1-a',
      cluster: {
        name: 'npme-test',
        description: 'a test cluster',
        nodePools: [
          {
            autoscaling: {
              enabled: true,
              maxNodeCount: 6,
              minNodeCount: 3
            },
            config: {
              machineType: 'n1-highmem-4',
              serviceAccount: 'test-project-k8s-sa',
              diskSizeGb: '120',
              imageType: 'COS',
              localSsdCount: 0,
              preemptible: false,
              oauthScopes: [
                'https://www.googleapis.com/auth/compute',
                'https://www.googleapis.com/auth/devstorage.read_only'
              ],
              workloadMetadataConfig: {
                nodeMetadata: 'SECURE'
              }
            },
            name: 'default-pool',
            initialNodeCount: 3,
            management: {
              autoRepair: true,
              autoUpgrade: true
            }
          }
        ],
        network: undefined,
        networkPolicy: {
          enabled: true,
          provider: 'CALICO'
        },
        clusterIpv4Cidr: undefined,
        initialClusterVersion: '1.8.1-gke.1',
        locations: ['us-central1-a'],
        masterAuth: {
          clientCertificateConfig: {
            issueClientCertificate: true
          },
          username: 'admin',
          password: 'admin'
        },
        addonsConfig: {
          httpLoadBalancing: {
            disabled: false
          },
          horizontalPodAutoscaling: {
            disabled: false
          },
          kubernetesDashboard: {
            disabled: true
          },
          networkPolicyConfig: {
            disabled: false
          }
        },
        legacyAbac: {
          enabled: false
        },
        managedAuthorizedNetworksConfig: {
          enabled: true,
          cidrBlocks: [
            {
              displayName: 'one',
              cidrBlock: '192.168.1.0/24'
            },
            {
              displayName: 'two',
              cidrBlock: '192.168.2.0/24'
            }
          ]
        },
        maintenancePolicy: {
          window: {
            dailyMaintenanceWindow: {
              startTime: '08:00'
            }
          }
        }
      }
    }
    roles = [
      'roles/logging.privateLogViewer',
      'roles/monitoring.metricWriter',
      'roles/monitoring.viewer',
      'roles/storage.admin',
      'roles/storage.objectAdmin',
      'roles/storage.objectCreator',
      'roles/storage.objectViewer'
    ]
    finalRoles = {
      version: 1,
      etag: 'bleepblorp',
      bindings: [
        {
          role: 'roles/owner',
          members: [
            'user:zaphod.beeblebrox@betelgeuse.galaxy'
          ]
        },
        {
          role: 'roles/logging.privateLogViewer',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/monitoring.metricWriter',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/monitoring.viewer',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/storage.admin',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/storage.objectAdmin',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/storage.objectCreator',
          members: [
            'systemAccount:someAccount'
          ]
        },
        {
          role: 'roles/storage.objectViewer',
          members: [
            'systemAccount:someAccount'
          ]
        }
      ]
    }
    initialAccessRoles = {
      version: 1,
      etag: 'abcdef12345678',
      bindings: [
      ]
    }
    initialRolesSet = {
      version: 1,
      etag: 'abcdef12345678',
      bindings: [
        {
          members: [
            'serviceAccount:test-project-k8s-sa'
          ],
          role: 'roles/storage.objectViewer'
        }
      ]
    }
    finalAccessRoles = {
      version: 2,
      etag: 'abcdef12345671',
      bindings: [
        {
          members: [
            'serviceAccount:test-project-k8s-sa'
          ],
          role: 'roles/storage.objectViewer'
        }
      ]
    }
    clusterCreated = {
      name: 'create',
      zone: clusterOptions.zones[0]
    }
  })

  describe('when creating everything', function () {
    describe('and all steps succeed', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      let storage
      let bucketMock
      let events
      before(function () {
        events = new EventEmitter()
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        storage = Storage(bucket)
        bucketMock = sinon.mock(bucket.iam)
        provider = Provider({}, resource, cloud, clusters, storage, events)
        resourceMock.expects('getProjects')
          .resolves([[]])
        resourceMock.expects('createProject')
          .withArgs(
            'test-project',
            {
              name: 'test-project',
              parent: {
                type: 'organization',
                id: 'my-org'
              }
            }
          )
          .resolves([
            'test-project',
            {
              promise: () => Promise.resolve([{response: {}}])
            },
            'done'
          ])

        cloudMock.expects('assignBilling')
          .withArgs('test-project', 'fake-billing-account-id')
          .resolves(true)

        cloudMock.expects('createServiceAccount')
          .withArgs(
            'test-project',
            'test-project-k8s-sa',
            'kubernetes cluster service account'
          )
          .resolves(true)

        cloudMock.expects('createCredentials')
          .withArgs('test-project', 'test-project-k8s-sa')
          .resolves({
            credentials: 'fake'
          })

        cloudMock.expects('assignRoles')
          .withArgs(
            'test-project',
            'serviceAccount',
            'test-project-k8s-sa',
            roles
          ).resolves(finalRoles)

        clustersMock.expects('createCluster')
          .withArgs(clusterConfiguration)
          .resolves([clusterCreated])

        clustersMock.expects('getOperation')
          .withArgs({
            projectId: 'test-project',
            zone: 'us-central1-a',
            operationId: 'create'
          })
          .resolves([
            { status: 'DONE' }
          ])

        clustersMock.expects('getCluster')
          .withArgs({
            projectId: 'test-project',
            zone: 'us-central1-a',
            clusterId: 'npme-test'
          })
          .exactly(2)
          .onCall(0).rejects([new Error('no cluster')])
          .onCall(1).resolves([ { endpoint: '1.1.1.1' } ])

        cloudMock.expects('enableService')
          .withArgs('test-project', 'servicemanagement.googleapis.com')
          .resolves()
        cloudMock.expects('enableService')
          .withArgs('test-project', 'compute.googleapis.com')
          .resolves()
        cloudMock.expects('enableService')
          .withArgs('test-project', 'container.googleapis.com')
          .resolves()
        cloudMock.expects('enableService')
          .withArgs('test-project', 'storage-component.googleapis.com')
          .resolves()
        cloudMock.expects('enableService')
          .withArgs('test-project', 'storage-api.googleapis.com')
          .resolves()

        bucketMock.expects('getPolicy')
          .resolves([initialAccessRoles])

        bucketMock.expects('setPolicy')
          .withArgs(initialRolesSet)
          .resolves(finalAccessRoles)
      })

      it('should resolve with cluster configuration', function () {
        return provider.create(clusterOptions)
          .should.partiallyEql({
            masterEndpoint: '1.1.1.1',
            operation: {
              name: 'create',
              zone: 'us-central1-a'
            }
          })
      })

      it('should make expected calls', function () {
        clustersMock.verify()
        resourceMock.verify()
        cloudMock.verify()
        bucketMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
        bucketMock.restore()
      })
    })
  })

  describe('when creating the cluster', function () {
    describe('and client call fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        clustersMock.expects('createCluster')
          .withArgs(clusterConfiguration)
          .rejects(new Error('invalid'))
      })

      it('should fail with error', function () {
        return provider.createCluster(meta.mergeOptions(clusterOptions, {}))
          .should.be.rejectedWith('invalid')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and client call succeeds', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        clustersMock.expects('createCluster')
          .withArgs(clusterConfiguration)
          .resolves([{
            name: 'create',
            zone: 'us-central1-a'
          }])
      })

      it('should succeed', function () {
        return provider.createCluster(meta.mergeOptions(clusterOptions, {}))
          .should.partiallyEql({
            operation: {
              name: 'create',
              zone: 'us-central1-a'
            }
          })
      })

      it('should call create cluster', function () {
        clustersMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })

  describe('when creating project', function () {
    describe('and resource call fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        resourceMock.expects('getProjects')
          .resolves([[]])
        resourceMock.expects('createProject')
          .withArgs(
            'test-project',
            {
              name: 'test-project',
              parent: {
                type: 'organization',
                id: 'my-org'
              }
            }
          )
          .rejects(new Error('no more projects for you'))
      })

      it('should fail with error', function () {
        return provider.createProject({
          name: 'test-project',
          organizationId: 'my-org'
        }).should.be.rejectedWith('failed to create project test-project for organization my-org with no more projects for you')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and operation promise fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        resourceMock.expects('getProjects')
          .resolves([[]])
        resourceMock.expects('createProject')
          .withArgs(
            'test-project',
            {
              name: 'test-project',
              parent: {
                type: 'organization',
                id: 'my-org'
              }
            }
          )
          .resolves([
            'test-project',
            {
              promise: () => Promise.reject(new Error('no more projects for you'))
            },
            'ohno'
          ])
      })

      it('should fail with error', function () {
        return provider.createProject({
          name: 'test-project',
          organizationId: 'my-org'
        }).should.be.rejectedWith('failed to create project test-project for organization my-org with no more projects for you')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and project creation is redundant', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        resourceMock.expects('getProjects')
          .resolves([[
            {
              id: 'test-project',
              metadata: { projectNumber: 100 }
            }
          ]])
        resourceMock.expects('createProject')
          .withArgs(
            'test-project',
            {
              name: 'test-project',
              parent: {
                type: 'organization',
                id: 'my-org'
              }
            }
          )
          .never()
      })

      it('should succeed', function () {
        return provider.createProject({
          name: 'test-project',
          organizationId: 'my-org'
        }).should.eventually.eql({
          response: { projectNumber: 100 }
        })
      })

      it('should call create project on reasource api', function () {
        resourceMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and project creation succeeds', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        resourceMock.expects('getProjects')
          .resolves([[{id: 'other-project'}]])
        resourceMock.expects('createProject')
          .withArgs(
            'test-project',
            {
              name: 'test-project',
              parent: {
                type: 'organization',
                id: 'my-org'
              }
            }
          )
          .resolves([
            'test-project',
            {
              promise: () => Promise.resolve([{response: 'done'}])
            },
            'done'
          ])
      })

      it('should succeed', function () {
        return provider.createProject({
          name: 'test-project',
          organizationId: 'my-org'
        }).should.eventually.eql({
          project: 'test-project',
          response: 'done'
        })
      })

      it('should call create project on reasource api', function () {
        resourceMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })

  describe('when creating service account', function () {
    describe('and iam call fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('createServiceAccount')
          .withArgs(
            'test-project',
            'test-project-sa',
            'kubernetes cluster service account'
          )
          .rejects(new Error('never ever'))
      })

      it('should fail with error', function () {
        return provider.createClusterService({
          serviceAccount: 'test-project-sa',
          projectId: 'test-project'
        }).should.be.rejectedWith('failed to create cluster service test-project-sa with never ever')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and iam succeeds', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      let options
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('createServiceAccount')
          .withArgs(
            'test-project',
            'sa',
            'kubernetes cluster service account'
          )
          .resolves({
            email: 'sa@test-project.iam.gserviceaccount.com'
          })
        options = {
          projectId: 'test-project',
          serviceAccount: 'sa'
        }
      })

      it('should succeed', function () {
        return provider.createClusterService(options)
          .should.eventually.eql({
            email: 'sa@test-project.iam.gserviceaccount.com'
          })
      })

      it('should replace serviceAccount with full email', function () {
        options.serviceAccount.should.eql('sa@test-project.iam.gserviceaccount.com')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })

  describe('when fixing billing association for project', function () {
    describe('and iam call fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('enableService')
          .withArgs('test-project', 'cloudbilling.googleapis.com')
          .resolves()
        cloudMock.expects('assignBilling')
          .withArgs('test-project', 'fake-billing-account-id')
          .rejects(new Error('invalid'))
      })

      it('should fail with error', function () {
        return provider.fixBilling({
          projectId: 'test-project',
          billingAccount: 'fake-billing-account-id',
          serviceAccount: 'test-account'
        }).should.be.rejectedWith('failed to associate billing with account test-account with invalid')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and iam succeeds', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('enableService')
          .withArgs('test-project', 'cloudbilling.googleapis.com')
          .resolves()
        cloudMock.expects('assignBilling')
          .withArgs('test-project', 'fake-billing-account-id')
          .resolves(true)
      })

      it('should succeed', function () {
        return provider.fixBilling({
          projectId: 'test-project',
          billingAccount: 'fake-billing-account-id'
        }).should.eventually.eql(true)
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })

  describe('when getting account credentials', function () {
    describe('and iam call fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('createCredentials')
          .withArgs('test-project', 'test-account')
          .rejects(new Error('what?'))
      })

      it('should fail with error', function () {
        return provider.getAccountCredentials({
          projectId: 'test-project',
          serviceAccount: 'test-account'
        }).should.be.rejectedWith('failed to get account credentials for test-account with what?')
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and iam succeeds', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)
        cloudMock.expects('createCredentials')
          .withArgs('test-project', 'test-account')
          .resolves({
            credentials: 'fake'
          })
      })

      it('should resolve with credentials', function () {
        return provider.getAccountCredentials({
          projectId: 'test-project',
          serviceAccount: 'test-account'
        }).should.eventually.eql({
          credentials: 'fake'
        })
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })

  describe('when getting cluster configuration', function () {
    let resourceMock
    let cloudMock
    let clustersMock
    let provider
    before(function () {
      resourceMock = sinon.mock(resource)
      cloudMock = sinon.mock(cloud)
      clustersMock = sinon.mock(clusters)
      provider = Provider({}, resource, cloud, clusters)
    })

    it('should provide valid google config format', function () {
      provider.getClusterConfig(meta.mergeOptions(clusterOptions))
        .should.eql(clusterConfiguration)
    })

    after(function () {
      resourceMock.restore()
      cloudMock.restore()
      clustersMock.restore()
    })
  })

  describe('when getting node configuration', function () {
    let resourceMock
    let cloudMock
    let clustersMock
    let provider
    before(function () {
      resourceMock = sinon.mock(resource)
      cloudMock = sinon.mock(cloud)
      clustersMock = sinon.mock(clusters)
      provider = Provider({}, resource, cloud, clusters)
    })

    it('should provide valid google config format', function () {
      provider.getNodeConfig({
        serviceAccount: 'test-account',
        worker: {
          storage: {
            persistent: '122880MB'
          },
          count: 3,
          cores: 4,
          memory: '16384MB',
          reserved: true
        }
      }).should.eql({
        name: 'default-pool',
        initialNodeCount: 3,
        config: {
          machineType: 'n1-highmem-4',
          serviceAccount: 'test-account',
          diskSizeGb: 120,
          imageType: 'COS',
          localSsdCount: 0,
          preemptible: false,
          workloadMetadataConfig: {
            nodeMetadata: 'SECURE'
          },
          oauthScopes: [
            'https://www.googleapis.com/auth/compute',
            'https://www.googleapis.com/auth/devstorage.read_only'
          ]
        }
      })
    })

    after(function () {
      resourceMock.restore()
      cloudMock.restore()
      clustersMock.restore()
    })
  })

  describe('when setting roles', function () {
    describe('and assign roles fails', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)

        cloudMock.expects('assignRoles')
          .withArgs(
            'test-project',
            'serviceAccount',
            'some-account',
            roles
          ).rejects(new Error('nope'))
      })

      it('should reject with error', function () {
        return provider.setRoles({
          projectId: 'test-project',
          serviceAccount: 'some-account'
        }).should.be.rejectedWith('failed to assign roles to cluster service some-account with nope')
      })

      it('should have made expected iam calls', function () {
        cloudMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })

    describe('and calls succeed', function () {
      let resourceMock
      let cloudMock
      let clustersMock
      let provider
      before(function () {
        resourceMock = sinon.mock(resource)
        cloudMock = sinon.mock(cloud)
        clustersMock = sinon.mock(clusters)
        provider = Provider({}, resource, cloud, clusters)

        cloudMock.expects('assignRoles')
          .withArgs(
            'test-project',
            'serviceAccount',
            'some-account',
            roles
          ).resolves(finalRoles)
      })

      it('should resolve with full role set', function () {
        return provider.setRoles({
          projectId: 'test-project',
          serviceAccount: 'some-account'
        }).should.be.eventually.eql(finalRoles)
      })

      it('should have made expected iam calls', function () {
        cloudMock.verify()
      })

      after(function () {
        resourceMock.restore()
        cloudMock.restore()
        clustersMock.restore()
      })
    })
  })
})
