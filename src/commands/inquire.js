const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const toml = require('toml-j0.4')
const uuid = require('uuid')
const yaml = require('js-yaml')

const gkeZones = require('../google/zones')
const eksZones = require('../amazon/zones')

const SECRET_RGX = /(pass$|password|passwd|secret|secrt|scrt|secure)/i

const prompt = inquirer.createPromptModule()
let APIVersions
const getVersions = async (kube, data) => {
  if (APIVersions) {
    return APIVersions
  }
  APIVersions = await kube.getAPIVersions(data.projectId, data.zones[0])
  return APIVersions
}

async function acquireTokens (kube, provider, tokens, defaults = {}) {
  const prompts = tokens.reduce((acc, token) => {
    const list = GEO_LIST[provider]
    const settings = {
      type: 'input',
      name: token,
      message: `'${token}'`,
      default: readDefault(defaults, token),
      validate: (x) => {
        if (x === '' || x === undefined || x === null) {
          return 'Please provide a value for the token.'
        }
        return true
      }
    }
    if (token === 'zones') {
      settings.type = 'checkbox'
      settings.choices = list.map(x => x.geography)
      settings.filter = (selections) => {
        if (selections.length === 0) {
          return undefined
        } else {
          return selections.map(val => {
            let i = 0
            while (i <= list.length) {
              let item = list[ i ]
              if (item.geography === val) {
                return `${item.region}-${item.zones[ 0 ]}`
              }
              i++
            }
            return undefined
          })
        }
      }
    } else if (SECRET_RGX.test(token)) {
      settings.type = 'password'
      settings.default = uuid.v4()
    } else if (token === 'serviceAccount') {
      settings.default = (data) => {
        return `${data.projectId}-k8s-sa`
      }
    } else if (token === 'version') {
      settings.type = 'list'
      settings.default = async (data) => {
        const { defaultClusterVersion } = await getVersions(kube, data)
        return defaultClusterVersion
      }
      settings.choices = async (data) => {
        const { validMasterVersions } = await getVersions(kube, data)
        return validMasterVersions
      }
    }
    acc.push(settings)
    return acc
  }, [])
  return prompt(prompts)
}

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

function readDefault (defaults, token) {
  let levels = token.split('.')
  let obj = defaults
  while (levels.length >= 2) {
    let level = levels.shift()
    if (obj && obj[level]) {
      obj = obj[level]
    }
  }
  return obj ? obj[levels.shift()] : null
}

module.exports = {
  acquireTokens: acquireTokens,
  loadTokens: loadTokens
}

const GEO_LIST = {
  gke: gkeZones,
  eks: eksZones
}
