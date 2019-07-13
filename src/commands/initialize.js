const Kubeform = require('../index')
const pino = require('pino')
const path = require('path')
const fs = require('fs')
const os = require('os')
const inquire = require('./inquire')

function build () {
  return {
    data: {
      alias: 'f',
      description: 'the file used to satisfy missing fields from the default'
    },
    output: {
      alias: 'o',
      description: 'the file to write the cluster specification to',
      default: `./cluster-${Date.now()}.json`
    },
    defaults: {
      alias: 'd',
      description: 'the file to use for supplying default values',
      default: path.join(process.env.HOME, '/.kubeform')
    },
    auth: {
      alias: 'a',
      description: 'the auth file containing credentials for use with the provider',
      default: path.join(os.homedir(), '.gsauth.json'),
      required: true
    },
    provider: {
      alias: 'p',
      description: 'specify which cloud provider to use to select data centers from',
      default: 'gke'
    },
    verbose: {
      describe: 'output verbose logging',
      default: false,
      boolean: true
    }
  }
}

async function handle (args) {
  const log = pino({
    level: args.verbose ? 'debug' : 'info',
    name: 'kubeform',
    prettyPrint: {
      ignore: 'pid,hostname,time'
    }
  })

  if (args.provider) {
    process.env.KUBE_SERVICE = args.provider
  }
  if (args.auth) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = args.auth
  }
  const kube = new Kubeform({
    authFile: args.auth,
    provider: args.provider
  })

  const dataPath = args.data ? path.resolve(args.data) : null
  const defaultPath = args.defaults ? path.resolve(args.defaults) : null
  let full = {}
  let options = {}
  let defaults = {}
  if (defaultPath && fs.existsSync(defaultPath)) {
    defaults = inquire.loadTokens(defaultPath)
  }
  if (dataPath && fs.existsSync(dataPath)) {
    options.data = dataPath
  }
  try {
    log.info(`asking for a specification`)
    full = await kube.init(options)
  } catch (e) {
    if (!e.required) {
      log.error(`could not generate cluster specification due to ${e.stack}`)
      process.exit(100)
    } else {
      const tokens = await inquire.acquireTokens(kube, args.provider, e.required, defaults)
      options.tokens = tokens
      try {
        full = await kube.init(options)
      } catch (e) {
        log.error(`could not generate cluster specification due to ${e.stack}`)
      }
    }
  }
  const outputPath = path.resolve(args.output)
  fs.writeFileSync(
    outputPath,
    JSON.stringify(full, null, 2),
    { encoding: 'utf8' }
  )
  log.info(`new cluster specification written to '${outputPath}'`)
}

module.exports = function () {
  return {
    command: 'init [options]',
    desc: 'create a new kubeform cluster specification',
    builder: build(),
    handler: handle
  }
}
