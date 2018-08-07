
const common = require('@google-cloud/common')
const util = require('util')
const log = require('bole')('kubeform.google-iam')

function Iam (options) {
  if (!(this instanceof Iam)) {
    options = common.util.normalizeArguments(this, options)
    return new Iam(options)
  }

  const config = {
    baseUrl: 'https://iam.googleapis.com/v1',
    projectIdRequired: false,
    scopes: [
      'https://www.googleapis.com/auth/iam',
      'https://www.googleapis.com/auth/cloud-platform'
    ],
    packageJson: require('../../package.json')
  }
  this.projectId = options.projectId
  this.asyncReq = util.promisify(this.request.bind(this))
  common.Service.call(this, config, options)
}

Iam.prototype.assignBilling = async function assignBilling (projectId, billingAccount) {
  const body = {
    'billingAccountName': `billingAccounts/${billingAccount}`
  }
  const exists = await this.checkBilling(projectId, billingAccount)
  if (exists) {
    return Promise.resolve(body)
  }
  return this.asyncReq({
    method: 'PUT',
    uri: `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
    qs: { alt: 'json' },
    json: body
  })
}

Iam.prototype.assignRoles = async function assignRoles (projectId, accountType, accountName, roles) {
  let assigned = await this.getRoles(projectId)
  let error
  while (roles.length > 0) {
    const role = roles.pop()
    try {
      assigned = await this.assignRole(projectId, assigned, role, accountType, accountName)
    } catch (e) {
      error = e
      break
    }
  }
  if (error) {
    return Promise.reject(error)
  }
  return assigned
}

Iam.prototype.assignRole = function assignRole (projectId, existing, role, accountType, accountName) {
  let bindings = existing.bindings
  let i = 0
  let added
  const assignment = `${accountType}:${accountName}`
  while (i < bindings.length) {
    const binding = bindings[i]
    if (binding.role === role) {
      if (binding.members.indexOf(assignment) < 0) {
        binding.members.push(assignment)
      }
      added = true
    }
    i++
  }
  if (!added) {
    existing.bindings.push({
      role: role,
      members: [assignment]
    })
  }
  log.info(`adding role ${role} to ${accountName}`)
  return this.asyncReq({
    method: 'POST',
    uri: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:setIamPolicy`,
    qs: { alt: 'json' },
    json: { policy: existing }
  }).then(
    () => {
      return this.checkRole(projectId, existing)
    },
    async err => {
      if (err.message.indexOf('Please retry') >= 0) {
        log.warn(`Google's API wasn't "ready". Race conditions are fun! Retrying in 200ms ...`)
        await wait(200)
        let assigned = await this.getRoles(projectId)
        return this.assignRole(projectId, assigned, role, accountType, accountName)
      } else {
        const msg = `failed to assign ${role} to ${accountName} with ${err.message}`
        log.error(msg)
        throw new Error(msg)
      }
    }
  )
}

Iam.prototype.checkBilling = function checkBilling (projectId, billingAccount) {
  return this.asyncReq({
    method: 'GET',
    uri: `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
    qs: { alt: 'json' }
  }).then(
    result => {
      if (result.billingAccountName && result.billingAccountName.indexOf(billingAccount) >= 0) {
        return true
      } else {
        return false
      }
    },
    err => {
      log.error(`failed to check billing with error ${err.message}`)
      return false
    }
  )
}

Iam.prototype.checkRole = async function checkRole (projectId, existing) {
  let pause = 500
  let next
  do {
    next = await this.getRoles(projectId)
    if (next.etag !== existing.etag) {
      break
    }
    await wait(pause)
    pause *= 0.5
  } while (next.etag === existing.etag)
  return next
}

Iam.prototype.checkService = function checkService (operation) {
  return this.asyncReq({
    method: 'GET',
    uri: `https://servicemanagement.googleapis.com/v1/${operation}?alt=json`,
    qs: { alt: 'json' }
  }).then(
    result => {
      if (result.done) {
        return true
      } else {
        return false
      }
    }
  )
}

Iam.prototype.createCredentials = function createCredentials (projectId, accountName) {
  const body = { 'privateKeyType': 'TYPE_GOOGLE_CREDENTIALS_FILE' }
  return this.asyncReq({
    method: 'POST',
    uri: `projects/${projectId}/serviceAccounts/${accountName}/keys`,
    qs: { alt: 'json' },
    json: body
  }).then(
    resp => {
      let buffer = Buffer.from(resp.privateKeyData, 'base64')
      return JSON.parse(buffer.toString('utf8'))
    }
  )
}

Iam.prototype.createServiceAccount = async function createServiceAccount (projectId, accountName, displayName) {
  let body = {
    accountId: accountName,
    serviceAccount: {
      displayName: displayName
    }
  }
  const existing = await this.getServiceAccount(projectId, accountName)
  if (existing) {
    return Promise.resolve(existing)
  }
  return this.asyncReq({
    method: 'POST',
    uri: `/projects/${projectId}/serviceAccounts`,
    qs: { alt: 'json' },
    json: body
  })
}

Iam.prototype.enableService = function enableService (projectId, serviceName) {
  const body = { consumerId: `project:${projectId}` }
  log.debug(`enabling ${serviceName} on ${projectId}`)
  return this.asyncReq({
    method: 'POST',
    uri: `https://servicemanagement.googleapis.com/v1/services/${serviceName}:enable`,
    qs: { alt: 'json' },
    json: body
  }).then(
    result => {
      return this.waitForService(result.name)
    }
  )
}

Iam.prototype.getRoles = function getRoles (projectId) {
  return this.asyncReq({
    method: 'POST',
    uri: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`,
    qs: { alt: 'json' },
    json: {}
  })
}

Iam.prototype.getServiceAccount = function getServiceAccount (projectId, accountName) {
  return this.asyncReq({
    method: 'GET',
    uri: `/projects/${projectId}/serviceAccounts/${accountName}@${projectId}.iam.gserviceaccount.com`
  }).then(
    result => {
      return result
    },
    err => {
      log.error(`failed to get service account with ${err.message}`)
      return undefined
    }
  )
}

Iam.prototype.waitForService = async function waitForService (operation) {
  let pause = 500
  let ready = false
  do {
    ready = await this.checkService(operation)
    if (!ready) {
      await wait(pause)
      pause *= 0.5
    }
  } while (!ready)
  return ready
}

function wait (ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

util.inherits(Iam, common.Service)

module.exports = Iam
