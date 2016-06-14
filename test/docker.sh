#!/bin/bash

export NODE_ENV=development
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"
PATH=$PATH:$DIR/.bin/
COMPOSE=$(which docker-compose)

if [ -z "$NODE_VER" ]; then
  NODE_VER="6.2.0"
fi

if ! [ -x "$COMPOSE" ]; then
  mkdir $DIR/.bin
  curl -L https://github.com/docker/compose/releases/download/1.7.0/docker-compose-`uname -s`-`uname -m` > $DIR/.bin/docker-compose
  chmod +x $DIR/.bin/docker-compose
  COMPOSE=$(which docker-compose)
fi

function finish {
  $COMPOSE -f $DC stop
  $COMPOSE -f $DC rm -f
}
trap finish EXIT

chmod a+w ./test/redis-sentinel/*.conf

export IMAGE=makeomatic/alpine-node:$NODE_VER
$COMPOSE -f $DC up -d

# make sure that services are up
sleep 40

$COMPOSE -f $DC run --rm tester ./node_modules/.bin/mocha
