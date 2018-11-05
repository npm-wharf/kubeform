const bole = require('bole')
const log = bole('kubeform')
const path = require('path')
const fs = require('fs')
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

async function handle (Kubeform, debugOut, args) {
  bole.output({
    level: args.verbose ? 'debug' : 'info',
    stream: debugOut
  })

  const kube = new Kubeform({
    provider: 'none'
  })

  const dataPath = args.data ? path.resolve(args.data) : null
  const defaultPath = args.defaults ? path.resolve(args.defaults) : null
  let full = {}
  let options = {}
  if (defaultPath && fs.existsSync(defaultPath)) {
    options.defaults = defaultPath
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
      const tokens = await inquire.acquireTokens(args.provider, e.required)
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

module.exports = function (Kubeform, debugOut) {
  return {
    command: 'init [options]',
    desc: 'create a new kubeform cluster specification',
    builder: build(),
    handler: handle.bind(null, Kubeform, debugOut)
  }
}
