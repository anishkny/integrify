module.exports = {
  header: `# Changelog

All notable changes to this project will be documented in this file.
See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [Unreleased](https://github.com/anishkny/integrify/commits/main) (if any)
`,
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'chore', section: 'Chores' },
    { type: 'docs', section: 'Docs' },
    { type: 'style', section: 'Style' },
    { type: 'refactor', section: 'Refactor' },
    { type: 'perf', section: 'Performance' },
    { type: 'test', section: 'Tests' },
  ],
};
