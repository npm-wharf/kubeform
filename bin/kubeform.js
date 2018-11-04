#!/usr/bin/env node

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
  .command(require('../src/commands/initialize')(debugOut))
  .command(require('../src/commands/provision')(debugOut))
  .demandCommand(1, 'Please specify a command to proceed.')
  .help()
  .version()
  .argv