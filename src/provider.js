const Google = require('./google')
const Amazon = require('./amazon')
const None = require('./none')

module.exports = function (config, events) {
  switch (config.provider.toUpperCase()) {
    case 'GKE':
      return Google
    case 'EKS':
      return Amazon
    case 'NONE':
      return None
    default:
      throw new Error(`Provider ${config.provider} is not supported yet.`)
  }
}
