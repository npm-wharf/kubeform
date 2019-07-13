'use strict'
module.exports = {
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info',
  prettyPrint: {
    ignore: 'pid,time,hostname'
  }
}
