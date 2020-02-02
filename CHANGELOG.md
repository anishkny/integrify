# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.0.1](https://github.com/anishkny/integrify/compare/v3.0.0...v3.0.1) (2020-02-02)


### Docs

* Add code fences ([#46](https://github.com/anishkny/integrify/issues/46)) ([e305039](https://github.com/anishkny/integrify/commit/e3050398d525ad574d77a20b768410249bf1b995))


### Chores

* **deps:** Bump ([#47](https://github.com/anishkny/integrify/issues/47)) ([575c15c](https://github.com/anishkny/integrify/commit/575c15c73755dc9765c8826619a277a500b0416f))

## [3.0.0](https://github.com/anishkny/integrify/compare/v2.2.2...v3.0.0) (2020-02-02)


### ⚠ BREAKING CHANGES

* **maintainCount:** MAINTAIN_COUNT rule now returns single onWrite trigger.
Previously, it used to return two triggers; onCreate and onDelete.
This should simplify usage.

Before:

```
[
  module.exports.incrementFavoritesCount,
  module.exports.decrementFavoritesCount,
] = integrify({
  rule: 'MAINTAIN_COUNT',
  ...
```

After:

```
module.exports.maintainFavoritesCount = integrify({
  rule: 'MAINTAIN_COUNT',
  ...
```

### Features

* **maintainCount:** Convert to single onWrite trigger ([#36](https://github.com/anishkny/integrify/issues/36)) ([00bdc97](https://github.com/anishkny/integrify/commit/00bdc978b8663dd9d33cdd3e63299be6ef95bf94))

### [2.2.2](https://github.com/anishkny/integrify/compare/v2.2.1...v2.2.2) (2019-09-15)


### Chores

* Add prepublishOnly script ([#33](https://github.com/anishkny/integrify/issues/33)) ([2aae2a6](https://github.com/anishkny/integrify/commit/2aae2a6))
* **changelog:** Include all commit types ([#35](https://github.com/anishkny/integrify/issues/35)) ([5c0b50c](https://github.com/anishkny/integrify/commit/5c0b50c))
* **changelog:** Name sections appropriately ([560ad90](https://github.com/anishkny/integrify/commit/560ad90))
* **script:** Add release script ([fc7f3a6](https://github.com/anishkny/integrify/commit/fc7f3a6))
* **scripts:** Add pre-commit, commit-msg husky hooks ([#34](https://github.com/anishkny/integrify/issues/34)) ([2cb0bba](https://github.com/anishkny/integrify/commit/2cb0bba))

### [2.2.1](https://github.com/anishkny/integrify/compare/v2.2.0...v2.2.1) (2019-08-20)

## [2.2.0](https://github.com/anishkny/integrify/compare/v2.1.0...v2.2.0) (2019-08-20)


### Features

* **deleteReferences:** Add ability to delete from collection groups ([#31](https://github.com/anishkny/integrify/issues/31)) ([ba31ab6](https://github.com/anishkny/integrify/commit/ba31ab6))

# [2.1.0](https://github.com/anishkny/integrify/compare/v2.0.0...v2.1.0) (2019-08-09)


### Features

* **replicateAttributes:** Add ability to replicate to collection groups (isCollectionGroup) ([#29](https://github.com/anishkny/integrify/issues/29)) ([2751b3e](https://github.com/anishkny/integrify/commit/2751b3e))



# [2.0.0](https://github.com/anishkny/integrify/compare/v1.2.1...v2.0.0) (2019-05-12)


* feat(rulesFile)!: Add ability to read rules from file on disk (#17) ([abdf5ce](https://github.com/anishkny/integrify/commit/abdf5ce)), closes [#17](https://github.com/anishkny/integrify/issues/17)


### BREAKING CHANGES

* Allows users to call `integrify()` with no arguments and rules specified in a file named `functions/integrify.rules.js`.

* feat: Handle all rules in file, add tests

* test(rulesFile): Add tests for rules in config file, error conditions etc

* docs(README): Add doc for rules in file



## [1.2.1](https://github.com/anishkny/integrify/compare/v1.2.0...v1.2.1) (2019-04-28)



<a name="1.2.0"></a>
# [1.2.0](https://github.com/anishkny/integrify/compare/v1.1.0...v1.2.0) (2019-02-07)


### Features

* **deleteReferences:** Add pre hook ([#8](https://github.com/anishkny/integrify/issues/8)) ([bd81d1f](https://github.com/anishkny/integrify/commit/bd81d1f))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/anishkny/integrify/compare/v1.0.3...v1.1.0) (2019-02-07)


### Features

* **replicateAttributes:** Add pre-hook ([#7](https://github.com/anishkny/integrify/issues/7)) ([903cc6a](https://github.com/anishkny/integrify/commit/903cc6a))



<a name="1.0.3"></a>
## [1.0.3](https://github.com/anishkny/integrify/compare/v1.0.2...v1.0.3) (2019-01-20)



<a name="1.0.2"></a>
## [1.0.2](https://github.com/anishkny/integrify/compare/v1.0.1...v1.0.2) (2019-01-19)


### Bug Fixes

* **maintainCount:** Do not update if target doc does not exist ([#2](https://github.com/anishkny/integrify/issues/2)) ([84528c4](https://github.com/anishkny/integrify/commit/84528c4))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/anishkny/integrify/compare/v1.0.0...v1.0.1) (2019-01-18)
