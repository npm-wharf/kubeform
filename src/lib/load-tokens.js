const fs = require('fs')
const path = require('path')

const toml = require('toml-j0.4')
const yaml = require('js-yaml')

/**
 * Read a cluster config from one of a variety of formats.
 *
 * @todo the cluster config is written by kubeform in JSON; perhaps we should
 * just use JSON to handle this and dump the YAML/TOML variants?
 *
 * @param {string} file - the name of the file to read from
 * @returns {object} a parsed version of these tokens
 */
function loadTokens (file) {
  const tokenFile = path.resolve(file)
  if (fs.existsSync(tokenFile)) {
    const raw = fs.readFileSync(tokenFile, 'utf8')
    try {
      switch (path.extname(tokenFile)) {
        case '.toml':
          return toml.parse(raw)
        case '.json':
          return JSON.parse(raw)
        case '.yml':
        case '.yaml':
          return yaml.safeLoad(raw)
        default:
          return toml.parse(raw)
      }
    } catch (e) {
      console.log(`The token file '${tokenFile}' threw an error when parsing. Proceeding without it.`)
    }
  } else {
    console.log(`The token file '${tokenFile}' does not exist or could not be read. Proceeding without it.`)
  }
}

module.exports = loadTokens
