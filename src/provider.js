module.exports = function (config, events) {
  switch (config.provider.toUpperCase()) {
    case 'GKE':
      return require('./google')(config, events)
    case 'NONE':
      return require('./none')
    default:
      throw new Error(`Provider ${config.provider} is not supported yet.`)
  }
}
