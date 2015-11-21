#/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DC="$DIR/docker-compose.yml"

docker-compose -f $DC up -d
docker run --link rabbitmq --link redis_client \
  --link redis_2 --link redis_3 --link redis_1 \
  --rm -it --name 'mservice-test' -e 'BLUEBIRD_DEBUG=1' \
  -v "$PWD":/usr/src/app -w /usr/src/app node:5 \
  ./node_modules/.bin/mocha --require ./test/babelhook.js --bail -R spec
exitCode=$?
docker-compose -f $DC stop
docker-compose -f $DC rm -f
exit ${exitCode}