# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.6.3"></a>
## [1.6.3](https://github.com/npm-wharf/kubeform/compare/v1.6.2...v1.6.3) (2019-08-02)


### Bug Fixes

* use clusterName everywhere ([bad9114](https://github.com/npm-wharf/kubeform/commit/bad9114))



<a name="1.6.2"></a>
## [1.6.2](https://github.com/npm-wharf/kubeform/compare/v1.6.1...v1.6.2) (2019-08-01)


### Bug Fixes

* the clusterName has restrictions, name doesn't ([7103819](https://github.com/npm-wharf/kubeform/commit/7103819))



<a name="1.6.1"></a>
## [1.6.1](https://github.com/npm-wharf/kubeform/compare/v1.6.0...v1.6.1) (2019-08-01)


### Bug Fixes

* allow a clusterName argument ([ba6fa86](https://github.com/npm-wharf/kubeform/commit/ba6fa86))



<a name="1.6.0"></a>
# [1.6.0](https://github.com/npm-wharf/kubeform/compare/v1.4.3...v1.6.0) (2019-07-13)


### Bug Fixes

* actally pretty print ([f2f7d1f](https://github.com/npm-wharf/kubeform/commit/f2f7d1f))


### Features

* pretty print logs ([f47f5a4](https://github.com/npm-wharf/kubeform/commit/f47f5a4))



<a name="1.5.0"></a>
# [1.5.0](https://github.com/npm-wharf/kubeform/compare/v1.4.3...v1.5.0) (2019-07-13)


### Features

* pretty print logs ([9eca607](https://github.com/npm-wharf/kubeform/commit/9eca607))



<a name="1.4.3"></a>
## [1.4.3](https://github.com/npm-wharf/kubeform/compare/v1.4.2...v1.4.3) (2019-04-25)


### Bug Fixes

* wrong projectId ([e98b57b](https://github.com/npm-wharf/kubeform/commit/e98b57b))



<a name="1.4.2"></a>
## [1.4.2](https://github.com/npm-wharf/kubeform/compare/v1.4.1...v1.4.2) (2019-04-25)


### Bug Fixes

* typo ([b32ccc7](https://github.com/npm-wharf/kubeform/commit/b32ccc7))



<a name="1.4.1"></a>
## [1.4.1](https://github.com/npm-wharf/kubeform/compare/v1.4.0...v1.4.1) (2019-04-25)


### Bug Fixes

* use the real clsuter password, if it exists ([1a84786](https://github.com/npm-wharf/kubeform/commit/1a84786))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/npm-wharf/kubeform/compare/v1.3.2...v1.4.0) (2019-04-24)


### Bug Fixes

* differentiate between root-level applicationCredentials and project level credentials ([8a2b19a](https://github.com/npm-wharf/kubeform/commit/8a2b19a))


### Features

* check to see if services/roles are enabled before adding them ([#6](https://github.com/npm-wharf/kubeform/issues/6)) ([e122b29](https://github.com/npm-wharf/kubeform/commit/e122b29))



<a name="1.3.2"></a>
## [1.3.2](https://github.com/npm-wharf/kubeform/compare/v1.3.1...v1.3.2) (2019-04-22)


### Bug Fixes

* allow passing credentials directly ([64a0ad0](https://github.com/npm-wharf/kubeform/commit/64a0ad0))



<a name="1.3.1"></a>
## [1.3.1](https://github.com/npm-wharf/kubeform/compare/v1.3.0...v1.3.1) (2019-01-17)



<a name="1.3.0"></a>
# [1.3.0](https://github.com/npm-wharf/kubeform/compare/v1.2.5...v1.3.0) (2019-01-05)


### Features

* protect against attempts to recreate clusters, fetch version list during CLI initialization, allow re-use of service account credentials ([d641482](https://github.com/npm-wharf/kubeform/commit/d641482))



<a name="1.2.5"></a>
## [1.2.5](https://github.com/npm-wharf/kubeform/compare/v1.2.4...v1.2.5) (2018-11-15)


### Bug Fixes

* improve the prompt approach used in init ([8c21ea7](https://github.com/npm-wharf/kubeform/commit/8c21ea7))



<a name="1.2.4"></a>
## [1.2.4](https://github.com/npm-wharf/kubeform/compare/v1.2.3...v1.2.4) (2018-11-06)


### Bug Fixes

* correct problem in type coercion for booleans ([2c2e177](https://github.com/npm-wharf/kubeform/commit/2c2e177))



<a name="1.2.3"></a>
## [1.2.3](https://github.com/npm-wharf/kubeform/compare/v1.2.2...v1.2.3) (2018-11-05)


### Bug Fixes

* correct an issue in the provision command CLI implementation ([def921e](https://github.com/npm-wharf/kubeform/commit/def921e))



<a name="1.2.2"></a>
## [1.2.2](https://github.com/npm-wharf/kubeform/compare/v1.2.1...v1.2.2) (2018-11-05)


### Bug Fixes

* allow unknown keys in cluster configuration (don't throw validation errors) ([30a39fb](https://github.com/npm-wharf/kubeform/commit/30a39fb))



<a name="1.2.1"></a>
## [1.2.1](https://github.com/npm-wharf/kubeform/compare/v1.2.0...v1.2.1) (2018-11-05)


### Bug Fixes

* remove array type specifier for zones to prevent double array wrapping in CLI ([dc62cc9](https://github.com/npm-wharf/kubeform/commit/dc62cc9))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/npm-wharf/kubeform/compare/v1.1.0...v1.2.0) (2018-11-05)


### Features

* improve initialization; add geographic selection to CLI ([28d72d1](https://github.com/npm-wharf/kubeform/commit/28d72d1))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/npm-wharf/kubeform/compare/v1.0.1...v1.1.0) (2018-11-04)


### Features

* add cluster spec initialization support and improve CLI behavior ([17380ff](https://github.com/npm-wharf/kubeform/commit/17380ff))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/npm-wharf/kubeform/compare/v1.0.0...v1.0.1) (2018-10-05)


### Bug Fixes

* update package.json to [@npm-wharf](https://github.com/npm-wharf) scope pre-publish ([741bd08](https://github.com/npm-wharf/kubeform/commit/741bd08))
