#!/usr/bin/env bash
set -x
set -e

export SCRIPTDIR="$( cd "$( dirname "$0" )" && pwd )"
cd $SCRIPTDIR
pwd
rm -rf ../.nyc_output ../coverage

npx nyc -r html -r text -r lcov ava --verbose --fail-fast --serial --timeout 30s *.test.js
