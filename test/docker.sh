#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"
PATH=$PATH:$DIR/.bin/
COMPOSE="docker-compose -f $DC"

if ! [ -x "$(which docker-compose)" ]; then
  mkdir $DIR/.bin
  curl -L https://github.com/docker/compose/releases/download/1.7.0/docker-compose-`uname -s`-`uname -m` > $DIR/.bin/docker-compose
  chmod +x $DIR/.bin/docker-compose
fi

trap "$COMPOSE stop; $COMPOSE rm -f;" EXIT

chmod a+w ./test/redis-sentinel/*.conf
$COMPOSE up -d

# make sure that services are up
sleep 180

$COMPOSE run --rm tester ./node_modules/.bin/mocha
