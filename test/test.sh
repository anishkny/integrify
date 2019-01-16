#!/usr/bin/env bash
set -x
set -e

export SCRIPTDIR="$( cd "$( dirname "$0" )" && pwd )"
cd $SCRIPTDIR
pwd

cp -r ../lib functions/
ava --verbose --fail-fast --serial *.test.js
