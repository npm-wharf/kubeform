# kubeform

A module for initializing new Kubernetes clusters via available 3rd party providers (GKE is the only implementation atm).

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]
[![Version npm][version-image]][version-url]
[![npm Downloads][downloads-image]][downloads-url]
[![Dependencies][dependencies-image]][dependencies-url]

## Approach

### GKE

At present, the approach is to make use of a service account that has the IAM roles:

 * `roles/billing.projectManager`
 * `roles/container.clusterAdmin`
 * `roles/editor`
 * `roles/iam.roleAdmin`
 * `roles/iam.roleViewer`
 * `roles/resourcemanager.organizationAdmin`
 * `roles/resourcemanager.projectCreator`
 * `roles/resourcemanager.projectIamAdmin`

So that it can create a project per cluster and create a specialized service account for the cluster and assign it the roles required for it to do the job needed. This bypasses several security concerns that would exist if all clusters were to exist within a single project and used the top-level, default security account.

You can grant the necessary roles to a service account with the following gcloud CLI command:

```shell
gcloud organizations add-iam-policy-binding [organization id] --member serviceAccount:[full service account id] --role [role]
```

## Environment

Certain options can be set via environment variables:

| Variable | Description | Default |
|:-:|---|---|
| `KUBERNETES_PROVIDER` | The backing service to use for the request | `'GKE'` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google API credentials file | `''` |
| `GOOGLE_ORGANIZATION_ID` | Google Organization Id to create projects under | `''` |
| `GOOGLE_BILLING_ID` | Google Billing Account Id to associate with project | `''` |
| `SERVICE_ACCOUNT_CREDENTIALS` | Path to existing Service Account credentials file | `''` |

## Events Emitted

After calling `create` the instance will emit events to provide some indication of progress and metadata being fed back from the creation process:

### `prerequisites-created`

**GKE provider**:
```js
{
  provider: 'gke',
  prerequisites: [
    'project-created',
    'service-apis-enabled',
    'billing-associated',
    'service-account-created',
    'account-credentials-acquired',
    'iam-roles-assigned'
  ]
}
```

### `bucket-permissions-set`

```js
{
  readAccess: [ ],
  writeAccess: [ ]
}
```

### `cluster-initialized`

```js
{
  kubernetesCluster: {
    projectId: '',
    zone: [],
    cluster: {
      name: '',
      description: '',
      nodePools: [
        {
          ...
        }
      ],
      network: ,
      clusterIpv4Cidr: ,
      initialClusterVersion: '',
      locations: [],
      addonsConfig: {
        ...
      },
      masterAuth: {
        user: '',
        password: ''
      }
    }
  }
}
```

## API

### `constructor (config)`

The constructor takes an optional set of properties in the hash to provide required settings directly instead of requiring environment variables:

 * `authFile`: the location of the file containing credentials to use for authentication when creating projects and clusters
 * `applicationCredentials`: the same as above, except the literal credentials object
 * `credFile`: the location of the file containing credentials to use for within the cluster's project for basic operations.  If omitted, new credentials will be created for the project
 * `credentials`: the same as above, except the literal credentials object
 * `billingAccount`: the id of the billing account to associate with the project & cluster
 * `organizationId`: the organization identity
 * `provider`: the name of the Kubernetes provider currently `gke` or `none`

```js
const Kubeform = require('@npm-wharf/kubeform')
const kube = new Kubeform({
  authFile: '/path/to/auth.json',
  billingAccount: '11223344',
  organizationId: '123-4567-890',
  provider: 'gke'
})
```

### `create (options)`

Send a creation request to the underlying Kubernetes service with desired options. Returns a promise that resolves when the cluster is created or rejects if an error occurs during the initial API call or during creation.

Options is a (somewhat) sanitized hash of characteristics you want for the cluster.

```js
// defaults values for each option shown in options hash,
// omitted options will fall back to default value
// defaults are not assumed to work for general purposes,
// they exist to get you *something* but you should provide
// values that make sense for your cluster
kube.create(
  {
    name: '',
    description: '',
    locations: [], // the regions or zones to provision the master and workers in
    serviceAccount: '',
    readableBuckets: [], // existing buckets to grant the service account read access to
    writeableBuckets: [], // existing buckets to grant the service account write access to
    version: '1.10.11-gke.1', // a valid Kubernetes cluster version for the cloud provider
    basicAuth: true,
    user: 'admin', // basic auth user name
    password: '', // basic auth password - UUID generated by default
    managers: 1, //
    manager: {
      distributed: false, // spread manager nodes across region (multi-zone)
    },
    credentials: { // optional way to re-use previously acquired service account credentials
      type: "service_account",
      project_id: "project-name",
      private_key_id: "000000000000000000000000000001",
      private_key: "-----BEGIN PRIVATE  KEY-----\n-----END PRIVATE KEY-----\n", // required
      client_email: "project-name-k8s-sa@project-name.iam.gserviceaccount.com", // required
      client_id: "000000000000000000001",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/project-name-k8s-sa%40project-name.iam.gserviceaccount.com"
    },
    worker: { // desired resourcing per worker
      cores: 2, // cores per VM/machine
      memory: '13GB', // memory followed by units in GB or MB
      count: 3, // default worker count,
      min: 3, // if autoscaling is on, a minimum and max are required
      max: 6, // if autoscaling is on, a minimum and max are required
      maxPerInstance: 4, // matches 3 x the # of workers by default, instances (or pools) are how most providers span a cluster across AZs
      reserved: true, // whether the service should assign nodes that can provide availability guarantees or not (and cost less)
      maintenanceWindow: '08:00', // time in UTC for when automated maint should begin
      storage: {
        ephemeral: '0GB', // unreliable but usually cheaper/free storage :grimacing:
        persistent: '100GB', // how much reliable storage to attach to the instance - usually costs extra
      },
      network: {
        range: '', // give containers a CIDR range to be assigned within
        vpc: '' // set the id/name for a preset network or VPC
      }
    },
    flags: {
      alphaFeatures: false, // allow alpha features
      authedNetworksOnly: false, // only allow authorized networks to communicate with master nodes
      autoRepair: true, // service should auto-repair down/unresponsive nodes
      autoScale: false, // allow the service to detect load and scale workers up and down
      autoUpgrade: false, // allow the service to auto-upgrade kubernetes
      basicAuth: true, // allow basic auth
      clientCert: true, // generate a client cert automatically
      includeDashboard: false, // include a default installation of the kubernetes dashboard
      legacyAuthorization: false, // must be false for full RBAC
      loadBalancedHTTP: true, // required for use with Google's Cloud LB
      networkPolicy: true, // turn on network policies (calico)
      privateCluster: false, // nodes do not receive public IPs and the master is inaccessible by default
      serviceMonitoring: false, // should the service perform additonal monitoring
      serviceLogging: false // should the service perform additional logging
    }
  }
)
```

#### About Service Credentials

In many cases, cloud providers will issue a new set of credentials for the service account every time you run kubeform. The idempotent nature of kubeform will prevent new clusters from being created, but will not prevent new keys from being acquired to ensure that the credentials block gets populated in the resulting data about your cluster.

To prevent this, you can pre-populate the options with a credentials hash that will require certain fields based on the chosen cloud provider. Kubeform will re-use these credentials and bypass the credentials acquisition step when it detects this.

### `getRegions ()`

Returns a list of available regions.

### `getVersions (projectId, zoneId)`

Returns the list of valid Kubernetes versions for the project and zone given the chosen cloud provider.

### `getZones (region)`

Given a region, list the zones available.

### `init (options)`

The init command was created to help create a valid kubeform cluster specification from a `~/.kubeform` file that provides defaults.

The options hash can have 3 of the following properties:

 * `defaults` - the file to use for defaults, `~/.kubeform`
 * `data` - a hash or file path to supply overrides/missing values

When called without a `data` property (that must either be a hash containing missing values, or a string pointing to a file that can supply missing values), this function will throw an error that has a `.required` property containing an array of values necessary to create a minimal cluster specification.

If all required data is present, the full specification will be the result of the function.

## CLI

### `kubeform provision ./path/to/config -a ./path/to/authFile.json -p gke -c ./path/to/service-credentials.json`

Will attempt to provision a Kuberenetes cluster using the provider specified. Provider defaults to GKE. Auth file is required.

 * `-a`, `--auth` : the path to the authorization file.

Additional options:

 * `-c`, `--credentials` : service account credentials to re-use for your cluster
 * `-o`, `--organization` : the organization id that owns the cluster
 * `-b`, `--billing` : the billing id that the cluster should be associated with
 * `-f`, `--file` : the file to write all cluster details to

Both of these options may be provided via the configuration file and are likely to vary between providers.

### `kubeform init -f ./data.toml -a ./path/to/authFile -p gke`

Creates a new Kubernetes cluster specification. Auth file is required.

 * `-a`, `--auth` : the path to the authorization file.

Additional options:

 * `-f`, `--data` : the file used to satisfy missing fields from the default
 * `-d`, `--defaults` : the file to use for supplying default values
 * `-o`, `--output` : the file to write the cluster specification to
 * `--verbose` : output verbose logging

## Long-term Goals

 * add an API to price options hash before creation
 * add support for EKS
 * add support for AKS
 * add support for kops?

## Full kubeform Specification in TOML format

The only properties shown here that are **not** required by kubeform are the network properties as these are optional settings.

```toml
name = "my-cluster"
description = "this is my cluster"
projectId = "my-project"
billingId = "123-456-789"
organizationId = "1234567890"
version = "1.10.11-gke.1"
zones = [ "us-central1-a" ]
basicAuth = true
user = "admin"
password = "thisisapasswordformanagingk8s"
serviceAccount = "my-k8s-sa"
readableBuckets = []
writeableBuclets = []

managers = 1
[manager]
  distributed = false

[worker]
  cores = 2
  memory = "13GB"
  count = 3
  min = 3
  max = 6
  maxPerInstance = 4
  reserved = true
  maintenanceWindow = "08:00"

[worker.storage]
  ephemeral = "0GB"
  persistent = "100GB"

[worker.network]
  range = "10.0.0.0/32"
  vpc = "my-vpc"

[flags]
  alphaFeatures = false
  authedNetworksOnly = false
  autoRepair = true
  autoScale = true
  autoUpgrade = true
  basicAuth = true
  clientCert = true
  includeDashboard = false
  legacyAuthorization = false
  loadBalancedHTTP = true
  networkPolicy = true
  privateCluster = false
  serviceMonitoring = false
  serviceLogging = false
```

## Example `~/.kubeform` file

```toml
basicAuth = true
user = "admin"
managers = 1

[manager]
  distributed = false

[worker]
  cores = 2
  memory = "13GB"
  maxPerInstance = 4
  reserved = true
  maintenanceWindow = "08:00"

[worker.storage]
  ephemeral = "0GB"
  persistent = "160GB"

[flags]
  alphaFeatures = false
  authedNetworksOnly = false
  autoRepair = true
  autoScale = true
  autoUpgrade = true
  basicAuth = true
  clientCert = true
  includeDashboard = false
  legacyAuthorization = false
  loadBalancedHTTP = true
  networkPolicy = true
  privateCluster = false
  serviceMonitoring = false
  serviceLogging = false
```

[travis-image]: https://travis-ci.org/npm-wharf/kubeform.svg?branch=master
[travis-url]: https://travis-ci.org/npm-wharf/kubeform
[coveralls-url]: https://coveralls.io/github/npm-wharf/kubeform?branch=master
[coveralls-image]: https://coveralls.io/repos/github/npm-wharf/kubeform/badge.svg?branch=master
[version-image]: https://img.shields.io/npm/v/@npm-wharf/kubeform.svg?style=flat
[version-url]: https://www.npmjs.com/package/@npm-wharf/kubeform
[downloads-image]: https://img.shields.io/npm/dm/@npm-wharf/kubeform.svg?style=flat
[downloads-url]: https://www.npmjs.com/package/@npm-wharf/kubeform
[dependencies-image]: https://img.shields.io/david/npm-wharf/kubeform.svg?style=flat
[dependencies-url]: https://david-dm.org/npm-wharf/kubeform
