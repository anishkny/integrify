#!/usr/bin/env bash
set -x
set -e

export SCRIPTDIR="$( cd "$( dirname "$0" )" && pwd )"
cd $SCRIPTDIR
pwd

cp ../lib/index.js functions/integrify.js
ava --verbose --fail-fast --serial *.test.js
