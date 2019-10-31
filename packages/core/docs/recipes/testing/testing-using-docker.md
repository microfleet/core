# Execute tests using Docker
Usually any project you develop requires Unit and Integrational tests.
This recipies intended for Newbies. If your are one of the Guru's and you have own boilerplate or toolset you can skip reading this recipe.

Not all tests you develop could be run on your local PC and require additional Software such as: Database, Brokers or other services.

This recipes do not attempt to be Full Solution and just show some simple appliances.

# Simple docker-compose
Assuming that you already configured your `package.json` and can run your tests using `yarn test` command.

### 1. Create your Dockerfile
First you need to create Dockerfile to build an image for Docker.
We will use `node:12` Docker image.

```Dockerfile
#./test/Dockerfile.test
FROM node:12

WORKDIR .
# Mount your sources into /src directory
VOLUME /src
```

### 2. Create docker-compose.yml
For now we will configure only Node.js Image with Project sources mounted on `/src` volume.

```yaml
#./test/docker-compose.yml
version: '2'

services:
  tester:
    expose:
      - "3000"
    build:
      context: ../
      dockerfile: Dockerfile.test
    working_dir: /src
    volumes:
      - ${PWD}:/src
    environment:
      NODE_ENV: "test"
      DEBUG: ${DEBUG}
    command: tail -f /dev/null
```

After performing these steps you'll be able to run your tests in Docker using command:

```bash
$#: docker-compose -f docker-compose.yml run --rm tester yarn test
```

Result is going to look like:

```bash
$#: docker-compose -f test/docker-compose.yml run --rm tester yarn test
WARNING: The DEBUG variable is not set. Defaulting to a blank string.
yarn run v1.19.1
$ mocha


  server
    ✓ should be able to start (426ms)
    ✓ should say hello world (160ms)

  2 passing (592ms)

Done in 1.10s.
```

HOORAY! Your tests run in Docker.

## 4. Update your package.json
Now you can save previous command in your `package.json`
```json
{
  "scripts": {
    "test:docker": "docker-compose -f test/docker-compose.yml run --rm tester yarn test"
  },
}
```
After this you will be able to run your tests using `yarn test:docker` command.

**TODO Additional services**

## Using `@makeomatic/mdep`
* [ ] Describe approaches of using `mdep`
* Install mdep
* Configure mdeprc
* Change package json
* Some other stuff

## Using `scaffold`
**TODO Decide**
