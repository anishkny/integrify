#!/usr/bin/env bash
set -x
set -e

export SCRIPTDIR="$( cd "$( dirname "$0" )" && pwd )"
cd $SCRIPTDIR
pwd

cd functions
rm -f lib
ln -s ../../lib/
cd ..

rm -rf ../.nyc_output ../coverage

npx nyc --reporter=lcov --reporter=html --reporter=text ava --verbose --fail-fast --serial --timeout 30s *.test.js
