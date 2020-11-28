#!/usr/bin/env bash
set -x
set -e

export SCRIPTDIR="$( cd "$( dirname "$0" )" && pwd )"
cd $SCRIPTDIR
pwd
rm -rf ../.nyc_output ../coverage

export GCLOUD_PROJECT=dummy-project
export FIRESTORE_EMULATOR_HOST='localhost:8080'
npx nyc -r html -r text -r lcov firebase emulators:exec \
  'mocha --bail --exit --jobs 1 --timeout 30s *.test.js'

