#!/usr/bin/env bash
set -euxo pipefail

export MAIN_BRANCH="main"

## Ensure correct state
git checkout $MAIN_BRANCH
git pull
git push --dry-run
npm whoami

## Bump package version, generate CHANGELOG, tag release
npx commit-and-tag-version

## Push to GitHub and NPM
git push --follow-tags origin $MAIN_BRANCH
npm publish
