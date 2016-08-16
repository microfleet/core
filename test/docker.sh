#!/bin/bash

set -ex

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"
PATH=$PATH:$DIR/.bin/
COMPOSE="docker-compose -f $DC"
TESTS=${TESTS:-'./test/suites/*.js'}

if ! [ -x "$(which docker-compose)" ]; then
  mkdir $DIR/.bin
  curl -L https://github.com/docker/compose/releases/download/1.7.0/docker-compose-`uname -s`-`uname -m` > $DIR/.bin/docker-compose
  chmod +x $DIR/.bin/docker-compose
fi

if [[ x"$CI" == x"true" ]]; then
  trap "$COMPOSE logs; $COMPOSE stop; $COMPOSE rm -f -v;" EXIT
else
  trap "printf \"to remove containers use:\n\n$COMPOSE stop;\n$COMPOSE rm -f -v;\n\n\"" EXIT
fi

chmod a+w ./test/redis-sentinel/*.conf
$COMPOSE up -d

# make sure that services are up
if [[ x"$SKIP_REBUILD" == x"1" ]]; then
  echo "skipping rebuild & sleep";
else
  docker exec tester npm rebuild
  sleep 40
fi

docker exec tester ./node_modules/.bin/_mocha ${TESTS}
