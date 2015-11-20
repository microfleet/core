#/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"

docker-compose -f $DC up -d
export IP=$(docker-machine ip dev)
export REDIS_1=$(docker-compose -f $DC port redis_1 6379)
export REDIS_2=$(docker-compose -f $DC port redis_2 6379)
export REDIS_3=$(docker-compose -f $DC port redis_3 6379)
export RABBITMQ=$(docker-compose -f $DC port rabbitmq 5672)
BLUEBIRD_DEBUG=1 ./node_modules/.bin/mocha --require ./test/babelhook.js --bail -R spec
exitCode=$?
unset IP REDIS_1 REDIS_2 REDIS_3 RABBITMQ
docker-compose -f $DC stop
docker-compose -f $DC rm -f
exit ${exitCode}