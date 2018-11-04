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
    verbose: {
      describe: 'output verbose logging',
      default: false,
      boolean: true
    }
  }
}

async function handle (debugOut, args) {
  bole.output({
    level: args.verbose ? 'debug' : 'info',
    stream: debugOut
  })
  const original = process.env.KUBE_SERVICE
  process.env.KUBE_SERVICE = 'none'
  const Kubeform = require('../index')
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
  process.env.KUBE_SERVICE = original
  try {
    log.info(`asking for a specification`)
    full = await Kubeform.init(options)
  } catch (e) {
    if (!e.required) {
      log.error(`could not generate cluster specification due to ${e.stack}`)
      process.exit(100)
    } else {
      const tokens = await inquire.acquireTokens(e.required)
      options.tokens = tokens
      try {
        full = await Kubeform.init(options)
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

module.exports = function (debugOut) {
  return {
    command: 'init [options]',
    desc: 'create a new kubeform cluster specification',
    builder: build(),
    handler: handle.bind(null, debugOut)
  }
}
