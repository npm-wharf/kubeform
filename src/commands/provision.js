const pino = require('pino')
const Kubeform = require('../index')
const path = require('path')
const os = require('os')
const fs = require('fs')

function build () {
  return {
    configPath: {
      describe: 'path to the configuration file to use',
      default: './cluster.json'
    },
    provider: {
      alias: 'p',
      description: 'the provider to use to provision the Kubernetes cluster: gke (Google) or eks (Amazon)',
      default: process.env.KUBE_SERVICE
    },
    auth: {
      alias: 'a',
      description: 'the auth file containing credentials for use with the provider',
      default: path.join(os.homedir(), '.gsauth.json'),
      required: true
    },
    organization: {
      alias: 'o',
      description: 'the organization id that owns the cluster'
    },
    billing: {
      alias: 'b',
      description: 'the billing account to use for the cluster'
    },
    file: {
      alias: 'f',
      default: `./cluster-${Date.now()}.json`
    },
    credentials: {
      alias: 'c',
      description: 'a JSON file containing service account credentials to reuse for the cluster'
    },
    verbose: {
      describe: 'output verbose logging',
      default: false,
      boolean: true
    }
  }
}

async function handle (args) {
  if (args.provider) {
    process.env.KUBE_SERVICE = args.provider
  }
  if (args.auth) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = args.auth
    process.env.AWS_SHARED_CREDENTIALS_FILE = args.auth
  }
  if (args.credentials) {
    process.env.SERVICE_ACCOUNT_CREDENTIALS = args.credentials
  }
  if (args.organization) {
    process.env.GOOGLE_ORGANIZATION_ID = args.organization
  }
  if (args.billing) {
    process.env.GOOGLE_BILLING_ID = args.billing
  }

  const log = pino({
    level: args.verbose ? 'debug' : 'info',
    name: 'kubeform',
    prettyPrint: {
      translateTime: true
    }
  })

  const kube = new Kubeform({
    authFile: args.auth,
    credFile: args.credentials,
    billingAccount: args.billing,
    organizationId: args.organization,
    provider: args.provider
  })
  const fullPath = path.resolve(args.configPath)
  if (fs.existsSync(fullPath)) {
    try {
      const json = fs.readFileSync(fullPath, { encoding: 'utf8' })
      const config = JSON.parse(json)
      const cluster = await kube.create(config)
      const outputPath = path.resolve(args.file)
      fs.writeFileSync(
        outputPath,
        JSON.stringify(cluster, null, 2),
        { encoding: 'utf8' }
      )
      log.info(`cluster details written to '${outputPath}'`)
    } catch (e) {
      log.error(`failed to create cluster from file '${args.configPath}' with error: ${e.message}`)
    }
  } else {
    log.error(`no such file '${args.configPath}'`)
  }
}

module.exports = function () {
  return {
    command: 'provision <configPath> [options]',
    desc: 'provision a Kubernetes cluster',
    builder: build(),
    handler: handle
  }
}
