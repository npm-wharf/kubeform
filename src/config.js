module.exports = function (options) {
  return {
    authFile: options.authFile || process.env.GOOGLE_APPLICATIONS_CREDENTIALS,
    credFile: options.credFile || process.env.SERVICE_ACCOUNT_CREDENTIALS,
    billingAccount: options.billingAccount || process.env.GOOGLE_BILLING_ID,
    organizationId: options.organizationId || process.env.GOOGLE_ORGANIZATION_ID,
    provider: options.provider || process.env.KUBERNETES_PROVIDER || 'gke',
    projectId: options.projectId,
    applicationCredentials: options.applicationCredentials,
    credentials: options.credentials
  }
}
