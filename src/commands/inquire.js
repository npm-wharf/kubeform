const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const toml = require('toml-j0.4')
const uuid = require('uuid')
const yaml = require('js-yaml')

const SECRET_RGX = /(pass$|password|passwd|secret|secrt|scrt|secure)/i

const prompt = inquirer.createPromptModule()

function acquireTokens (provider, tokens, defaults = {}) {
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
  gke: [
    {
      region: 'us-east1',
      zones: [ 'b', 'c', 'd' ],
      geography: 'Moncks Corner, SC, USA'
    },
    {
      region: 'us-east4',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Ashburn, NV, USA'
    },
    {
      region: 'northamerica-northeast1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Montréal, Québec, CA'
    },
    {
      region: 'southamerica-east1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Sāo Paulo, Brazil'
    },
    {
      region: 'us-central1',
      zones: [ 'a', 'b', 'c', 'f' ],
      geography: 'Council Bluffs, IA, USA'
    },
    {
      region: 'us-west1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'The Dalles, OR, USA'
    },
    {
      region: 'us-west2',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Los Angeles, CA, USA'
    },
    {
      region: 'australia-southeast1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Sydney, AU'
    },
    {
      region: 'asia-southeast1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Jurong West, Singapore'
    },
    {
      region: 'asia-northeast1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Tokyo, Japan'
    },
    {
      region: 'asia-east1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Changhau County, Taiwan'
    },
    {
      region: 'asia-east2',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Hong Kong'
    },
    {
      region: 'asia-south1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Mumbai, India'
    },
    {
      region: 'europe-north1',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Hamina, Finland'
    },
    {
      region: 'europe-west1',
      zones: [ 'b', 'c', 'd' ],
      geography: 'St. Ghislain, Belgium'
    },
    {
      region: 'europe-west2',
      zones: [ 'a', 'b', 'c' ],
      geography: 'London, England, UK'
    },
    {
      region: 'europe-west3',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Frankfurt, Germany'
    },
    {
      region: 'europe-west4',
      zones: [ 'a', 'b', 'c' ],
      geography: 'Eemshaven, Netherlands'
    }
  ]
}
