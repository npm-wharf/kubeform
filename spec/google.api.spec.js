require('./setup')
const Cloud = require('../src/google/api')

const OAUTH_URL = 'https://www.googleapis.com/oauth2/v4/token'
const REVOKE_URL = 'https://accounts.google.com/o/oauth2/revoke?token='

function setAuthResponse (scope) {
  scope.post('', x => {
    return true
  }).reply(200, { access_token: 'ya29.test' })
}

function setRevokeResponse (scope) {
  scope.post(() => true, () => true)
    .reply(200, {})
}

describe('Google Cloud APIs', function () {
  let authScope
  let revokeScope

  before(function () {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = './spec/keys/testkey.json'
    authScope = nock(OAUTH_URL)
    revokeScope = nock(REVOKE_URL)
  })

  after(function () {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
    nock.cleanAll()
  })

  describe('when creating a service account', function () {
    let scope
    let cloud
    before(function () {
      scope = nock('https://iam.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
    })

    describe('and error occurs', function () {
      before(function () {
        scope.get('/projects/test-project/serviceAccounts/sa@test-project.iam.gserviceaccount.com')
          .reply(404, '{"error": "none such"}')
        scope.post('/projects/test-project/serviceAccounts?alt=json')
          .reply(400, '{"error": "no"}')
      })

      it('should reject with error', function () {
        return cloud.createServiceAccount('test-project', 'sa', 'service account')
          .should.be.rejectedWith('no')
      })
    })

    describe('and create succeeds (no account exists)', function () {
      before(function () {
        scope.get('/projects/test-project/serviceAccounts/sa@test-project.iam.gserviceaccount.com')
          .reply(404, '{"error": "none such"}')
        scope.post('/projects/test-project/serviceAccounts?alt=json', {
          accountId: 'sa',
          serviceAccount: {
            displayName: 'service account'
          }
        }).reply(200, '{"ok": true}')
      })

      it('should succeed with reply', function () {
        return cloud.createServiceAccount('test-project', 'sa', 'service account')
          .should.eventually.eql({
            ok: true
          })
      })
    })

    describe('and create succeeds (account exists)', function () {
      before(function () {
        scope.get('/projects/test-project/serviceAccounts/sa@test-project.iam.gserviceaccount.com')
          .reply(200, '{"ok": true}')
      })

      it('should succeed with reply', function () {
        return cloud.createServiceAccount('test-project', 'sa', 'service account')
          .should.eventually.eql({
            ok: true
          })
      })
    })

    after(function () {
      nock.cleanAll()
    })
  })

  describe('when creating key file', function () {
    let scope
    let cloud
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://iam.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
    })

    describe('and error occurs', function () {
      before(function () {
        scope.post(
          '/projects/test-project/serviceAccounts/svc-acct/keys?alt=json',
          { 'privateKeyType': 'TYPE_GOOGLE_CREDENTIALS_FILE' }
        ).reply(400, '{"error": "never"}')
      })

      it('should reject with error', function () {
        return cloud.createCredentials('test-project', 'svc-acct')
          .should.be.rejectedWith('never')
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        const data = {
          file: 'secrets',
          sneakcrets: 'erhmagershyall'
        }
        const json = JSON.stringify(data)
        const base64 = Buffer.from(json, 'utf8').toString('base64')
        scope.post(
          '/projects/test-project/serviceAccounts/svc-acct/keys?alt=json',
          { 'privateKeyType': 'TYPE_GOOGLE_CREDENTIALS_FILE' }
        ).reply(200, `{"privateKeyData": "${base64}"}`)
      })

      it('should resolve with json from privateKeyData', function () {
        return cloud.createCredentials('test-project', 'svc-acct')
          .should.eventually.eql({
            file: 'secrets',
            sneakcrets: 'erhmagershyall'
          })
      })
    })
  })

  describe('when getting roles', function () {
    let scope
    let cloud
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://cloudresourcemanager.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
    })

    describe('and error occurs', function () {
      before(function () {
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json',
          {}
        ).reply(403, '{"error": "unauthorized"}')
      })

      it('it should reject with error', function () {
        return cloud.getRoles('test-project')
          .should.be.rejectedWith('unauthorized')
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        const roleJson = JSON.stringify({
          version: 1,
          etag: 'bleepblorp',
          bindings: [
            {
              role: 'roles/owner',
              members: [
                'user:zaphod.beeblebrox@betelgeuse.galaxy'
              ]
            }
          ]
        })
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json',
          {}
        ).reply(200, roleJson)
      })

      it('it should resolve with role structure', function () {
        return cloud.getRoles('test-project')
          .should.eventually.eql({
            version: 1,
            etag: 'bleepblorp',
            bindings: [
              {
                role: 'roles/owner',
                members: [
                  'user:zaphod.beeblebrox@betelgeuse.galaxy'
                ]
              }
            ]
          })
      })
    })

    after(function () {
      nock.cleanAll()
    })
  })

  describe('when assigning roles', function () {
    let scope
    let iam
    let existing1, existing2, existing3
    let combined1, combined2
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://cloudresourcemanager.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      iam = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
      existing1 = {
        version: 1,
        etag: 'bleepblorp',
        bindings: [
          {
            role: 'roles/owner',
            members: [
              'user:zaphod.beeblebrox@betelgeuse.galaxy'
            ]
          }
        ]
      }
      existing2 = {
        version: 2,
        etag: 'beepboop',
        bindings: [
          {
            role: 'roles/owner',
            members: [
              'user:zaphod.beeblebrox@betelgeuse.galaxy'
            ]
          },
          {
            role: 'roles/admin',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          }
        ]
      }
      existing3 = {
        version: 3,
        etag: 'beebop',
        bindings: [
          {
            role: 'roles/owner',
            members: [
              'user:zaphod.beeblebrox@betelgeuse.galaxy'
            ]
          },
          {
            role: 'roles/admin',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          },
          {
            role: 'roles/cluster-thing',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          }
        ]
      }
      combined1 = {
        version: 1,
        etag: 'bleepblorp',
        bindings: [
          {
            role: 'roles/owner',
            members: [
              'user:zaphod.beeblebrox@betelgeuse.galaxy'
            ]
          },
          {
            role: 'roles/admin',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          }
        ]
      }
      combined2 = {
        version: 2,
        etag: 'beepboop',
        bindings: [
          {
            role: 'roles/owner',
            members: [
              'user:zaphod.beeblebrox@betelgeuse.galaxy'
            ]
          },
          {
            role: 'roles/admin',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          },
          {
            role: 'roles/cluster-thing',
            members: [
              'serviceAccount:service-account@test-project.test-project.iam.gserviceaccount.com'
            ]
          }
        ]
      }
    })

    describe('and error occurs on get', function () {
      before(function () {
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(403, '{"error": "unauthorized"}')
      })

      it('it should reject with error', function () {
        return iam.assignRoles(
          'test-project',
          'serviceAccount',
          'service-account@test-project.test-project.iam.gserviceaccount.com',
          [
            'roles/cluster-thing',
            'roles/admin'
          ]
        ).should.be.rejectedWith('unauthorized')
      })
    })

    describe('and error occurs on post', function () {
      before(function () {
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(200, JSON.stringify(existing1))
        scope.post(
          '/projects/test-project:setIamPolicy?alt=json',
          { policy: combined1 }
        ).reply(400, JSON.stringify({error: 'unauthorized'}))
      })

      it('it should reject with error', function () {
        this.timeout(10000)
        return iam.assignRoles(
          'test-project',
          'serviceAccount',
          'service-account@test-project.test-project.iam.gserviceaccount.com',
          [
            'roles/cluster-thing',
            'roles/admin'
          ]
        ).should.be.rejectedWith('unauthorized')
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        this.timeout(10000)
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(200, existing1)
        scope.post(
          '/projects/test-project:setIamPolicy?alt=json',
          { policy: combined1 }
        ).reply(400, '{"error": "Please retry"}')
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(200, existing1)
        scope.post(
          '/projects/test-project:setIamPolicy?alt=json',
          { policy: combined1 }
        ).reply(200, existing2)
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(200, existing2)
        scope.post(
          '/projects/test-project:setIamPolicy?alt=json',
          { policy: combined2 }
        ).reply(200, existing3)
        scope.post(
          '/projects/test-project:getIamPolicy?alt=json'
        ).reply(200, existing3)
      })

      it('it should reject with error', function () {
        return iam.assignRoles(
          'test-project',
          'serviceAccount',
          'service-account@test-project.test-project.iam.gserviceaccount.com',
          [
            'roles/cluster-thing',
            'roles/admin'
          ]
        ).should.eventually.eql(existing3)
      })
    })

    after(function () {
      nock.cleanAll()
    })
  })

  describe('when assigning billing to project', function () {
    let scope
    let cloud
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://cloudbilling.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
    })

    describe('and error occurs', function () {
      before(function () {
        scope.get(
          '/projects/test-project/billingInfo?alt=json'
        ).reply(200, '{}')
        scope.put(
          '/projects/test-project/billingInfo?alt=json',
          {
            'billingAccountName': `billingAccounts/this-is-a-fake-billing-id`
          }
        ).reply(403, '{"error": "unauthorized"}')
      })

      it('it should reject with error', function () {
        return cloud.assignBilling('test-project', 'this-is-a-fake-billing-id')
          .should.be.rejectedWith('unauthorized')
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        scope.get(
          '/projects/test-project/billingInfo?alt=json'
        ).reply(200, '{}')
        scope.put(
          '/projects/test-project/billingInfo?alt=json',
          {
            'billingAccountName': `billingAccounts/this-is-a-fake-billing-id`
          }
        ).reply(200, '{"ok": "yep"}')
      })

      it('it should reject with error', function () {
        return cloud.assignBilling('test-project', 'this-is-a-fake-billing-id')
          .should.eventually.eql({ok: 'yep'})
      })
    })

    after(function () {
      nock.cleanAll()
    })
  })

  describe('when enabling services', function () {
    let cloud
    let scope
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://servicemanagement.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
    })

    describe('and error occurs', function () {
      before(function () {
        scope.post(
          '/services/imaginary.googleapis.com:enable?alt=json',
          {
            'consumerId': `project:test-project`
          }
        ).reply(403, '{"error": "unauthorized"}')
      })

      it('it should reject with error', function () {
        return cloud.enableService('test-project', 'imaginary.googleapis.com')
          .should.be.rejectedWith('unauthorized')
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        scope.post(
          '/services/imaginary.googleapis.com:enable?alt=json',
          {
            'consumerId': `project:test-project`
          }
        ).reply(200, '{"name": "op1"}')
        scope.get(
          `/op1?alt=json`
        ).reply(200, '{ "running": true }')
        scope.get(
          `/op1?alt=json`
        ).reply(200, '{ "done": true }')
      })

      it('it should reject with error', function () {
        return cloud.enableService('test-project', 'imaginary.googleapis.com')
          .should.eventually.eql(true)
      })
    })
  })

  describe('when getting enabled services', function () {
    let cloud
    let scope
    before(function () {
      setAuthResponse(authScope)
      setRevokeResponse(revokeScope)
      scope = nock('https://serviceusage.googleapis.com/v1')
        .matchHeader('authorization', (val) => {
          // the bearer token changes each time because
          // blowfish lol, this is good enough to check
          // that the module is correctly loading a
          // keyfile and using it to create an authorization
          // header
          return /^Bearer[ ]ya29[.]/.test(val)
        })
      cloud = new Cloud({
        projectId: 'test-org',
        keyFile: './spec/keys/test-key.json'
      })
    })

    describe('and call succeeds', function () {
      before(function () {
        scope.get(
          '/projects/test-org/services?filter=state:ENABLED'
        ).reply(200, JSON.stringify({
          services: [{ name: 'test-org/services/imaginary.googleapis.com' }]
        }))
      })

      it('it should succeed', async function () {
        await cloud.getEnabledServices('test-org')
          .should.eventually.eql(['imaginary.googleapis.com'])
      })
    })

    describe('and there are no enabled services', function () {
      // Weirdly, Google's API returns a blank object with no services key!
      before(function () {
        scope.get(
          '/projects/test-org/services?filter=state:ENABLED'
        ).reply(200, JSON.stringify({}))
      })

      it('it should succeed', async function () {
        await cloud.getEnabledServices('test-org')
          .should.eventually.eql([])
      })
    })
  })
})
