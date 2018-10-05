#!/usr/bin/env node

const bole = require('bole')
const log = bole('kubeform')
const path = require('path')
const fs = require('fs')

const debugOut = {
  write: function (data) {
    const entry = JSON.parse(data)
    console.log(`${entry.time} - ${entry.level} ${entry.message}`)
  }
}

bole.output({
  level: 'debug',
  stream: debugOut
})

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(
    'provision <configPath>',
    'provision a cluster',
    yargs => {
      yargs.positional('configPath', {
        describe: 'path to the configuration file to use',
        default: './cluster.json'
      })
      yargs.options('provider', {
        alias: 'p',
        description: 'the provider to use to provision the Kubernetes cluster',
        default: 'gke'
      })
      yargs.options('auth', {
        alias: 'a',
        description: 'the auth file containing credentials for use witht he provider',
        required: true
      })
      yargs.options('organization', {
        alias: 'o',
        description: 'the organization id that owns the cluster'
      })
      yargs.options('billing', {
        alias: 'b',
        description: 'the billing account to use for the cluster'
      })
      return yargs.option('file', {
        alias: 'f',
        default: `./cluster-${Date.now()}.json`
      })
    },
    create
  )
  .argv

async function create (args) {
  if (args.provider) {
    process.env.KUBE_SERVICE = args.provider
  }
  if (args.auth) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = args.auth
  }
  if (args.organization) {
    process.env.GOOGLE_ORGANIZATION_ID = args.organization
  }
  if (args.billing) {
    process.env.GOOGLE_BILLING_ID = args.billing
  }
  const Kubeform = require('../src/index')
  const fullPath = path.resolve(args.configPath)
  if (fs.existsSync(fullPath)) {
    try {
      const json = fs.readFileSync(fullPath, { encoding: 'utf8' })
      const config = JSON.parse(json)
      const cluster = await Kubeform.create(config)
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
