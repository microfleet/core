#!/bin/bash

BIN=node_modules/.bin
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PATH=$PATH:$DIR/.bin/

# coverage & test files
COVER="$BIN/cross-env NODE_ENV=test $BIN/nyc"
# TESTS=${TESTS:-test/suites/*.js}
TESTS=test/suites/http.hapi.js

# compose stuff
DC="$DIR/docker-compose.yml"
COMPOSE=$(which docker-compose)
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

chmod a+w ./test/redis-sentinel/*.conf

# bring compose up
$COMPOSE up -d

set -e

if [[ "$SKIP_REBUILD" != "1" ]]; then
  echo "rebuilding native dependencies..."
  docker exec tester npm rebuild
  sleep 40
fi

echo "running tests"
for fn in $TESTS; do
  echo "running tests for $fn"
  docker exec tester /bin/sh -c "$COVER --report-dir ./coverage/${fn##*/} $BIN/mocha $fn"
done

if [[ x"$CI" == x"true" ]]; then
  echo "uploading coverage report from ./coverage/lcov.info"
  $BIN/codecov
fi
