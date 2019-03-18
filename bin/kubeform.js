#!/usr/bin/env node

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(require('../src/commands/initialize')())
  .command(require('../src/commands/provision')())
  .demandCommand(1, 'Please specify a command to proceed.')
  .help()
  .version()
  .argv
