#!/bin/sh

set -ex

BIN=$PWD/node_modules/.bin

# Transpile TypeScript for the unit tests
TSCONFIG=./tsconfig.json

 $(npm bin)/tsc \
        --sourceMap \
        --outDir ./build \
        --skipLibCheck \
        -t es6 \
        -m none \
        -p ${TSCONFIG}

# Generate the coverage report with Istanbul
node --harmony ./node_modules/istanbul/lib/cli.js cover --root build/src --report lcov --report text \
     ./node_modules/mocha/bin/_mocha -- -R spec --check-leaks ./build/test/**/*.js

# Check for Travis CI and Circle-CI environment
if [ $(env | grep TRAVIS_JOB_ID ) ] || [ $(env | grep CIRCLECI) ] ; then
  cat coverage/lcov.info | $BIN/coveralls || echo "Coveralls upload failed"
  # Upload to coveralls.io
  $BIN/codecov && rm -rf ./coverage
fi