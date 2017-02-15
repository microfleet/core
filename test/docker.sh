#!/bin/bash

set -x

BIN=node_modules/.bin
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"
PATH=$PATH:$DIR/.bin/
COMPOSE=$(which docker-compose)
MOCHA=$BIN/_mocha
COVER="$BIN/isparta cover"
NODE=$BIN/babel-node
TESTS=${TESTS:-test/suites/*.js}
COMPOSE_VER=${COMPOSE_VER:-1.7.1}
COMPOSE="docker-compose -f $DC"

if ! [ -x "$(which docker-compose)" ]; then
  mkdir $DIR/.bin
  curl -L https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-`uname -s`-`uname -m` > $DIR/.bin/docker-compose
  chmod +x $DIR/.bin/docker-compose
fi

if [[ x"$CI" == x"true" ]]; then
  trap "$COMPOSE stop; $COMPOSE rm -f -v;" EXIT
else
  trap "printf \"to remove containers use:\n\n$COMPOSE stop;\n$COMPOSE rm -f -v;\n\n\"" EXIT
fi

# bring compose up
$COMPOSE up -d

echo "cleaning old coverage"
rm -rf ./coverage

set -e

if [[ "$SKIP_REBUILD" != "1" ]]; then
  echo "rebuilding native dependencies..."
  docker exec tester npm rebuild
  sleep 40
fi

echo "running tests"
for fn in $TESTS; do
  echo "running tests for $fn"
  docker exec tester /bin/sh -c "$NODE $COVER --dir ./coverage/${fn##*/} $MOCHA -- --trace-deprecation $fn"
done

echo "started generating combined coverage"
docker exec tester test/aggregate-report.js

if [[ x"$CI" == x"true" ]]; then
  echo "uploading coverage report from ./coverage/lcov.info"
  $BIN/codecov -f ./coverage/lcov.info
fi
