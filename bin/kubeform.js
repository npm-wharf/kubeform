#!/usr/bin/env node
const Kubeform = require('../src/index')
const chalk = require('chalk')
const levelColors = {
  debug: 'gray',
  info: 'white',
  warn: 'yellow',
  error: 'red'
}

const debugOut = {
  write: function (data) {
    const entry = JSON.parse(data)
    const levelColor = levelColors[entry.level]
    console.log(`${chalk[levelColor](entry.time)} - ${chalk[levelColor](entry.level)} ${entry.message}`)
  }
}

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(require('../src/commands/initialize')(Kubeform, debugOut))
  .command(require('../src/commands/provision')(Kubeform, debugOut))
  .demandCommand(1, 'Please specify a command to proceed.')
  .help()
  .version()
  .argv
