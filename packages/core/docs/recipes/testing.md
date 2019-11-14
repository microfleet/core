# Execute tests using Docker
Usually, any project you develop requires Unit and Integrational tests.
This recipe intended for Newbies, so if you are one of the Guru's that have their boilerplate, you can skip this document.

Not every test you develop could be run on your local PC because they require additional Software such as Database Brokers or other services.

These recipes do not attempt to become the Full Solution and try to show some simple appliances.

# Contents
* [Test Using plain `docker-compose`](#simple-docker-compose)
* [Test Using `mdep` Tool](#mdep-as-a-swedish-knife)

# Simple docker-compose
Assuming that you already configured your `package.json` and able to run your tests using the `yarn test` command.

### 1. Create your Dockerfile
First, you need to create Dockerfile to build an image for Docker.
We will use `node:12` Docker image.

```Dockerfile
#./test/Dockerfile.test
FROM node:12

WORKDIR .
# Mount your sources into /src directory
VOLUME /src
```

### 2. Create docker-compose.yml
For now, we will configure only Node.js Image with Project sources mounted on `/src` volume.

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

After performing these steps, you'll be able to run your tests in Docker using the command:

```console
$: docker-compose -f docker-compose.yml run --rm tester yarn test
```

The result is going to look like:

```console
$: docker-compose -f test/docker-compose.yml run --rm tester yarn test
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
Now you can save the previous command in your `package.json`.
```json
{
  "scripts": {
    "test:docker": "docker-compose -f test/docker-compose.yml run --rm tester yarn test"
  },
}
```
After this, you will be able to run your tests using the `yarn test:docker` command.

# `mdep` As a Swedish Knife
`Microfleet` framework provides a special tool for instrumenting your development process. Please read [this page](https://www.npmjs.com/package/@makeomatic/deploy) to find advanced information and CLI commands.

## 1. Install `mdep` binary
First of all, you need to install the `@makeomatic/deploy` package, which provides `mdep` CLI command.

```console
u:~$ npm install --save @makeomatic/deploy
u:~$ npm install --save-dev cross-env
u:~$ npm install --save-dev nyc
u:~$ npm install --save-dev @babel/core @babel/register babel-plugin-istanbul babel-plugin-transform-strict-mode
```

The package adds `husky` and `semantic-release` packages into your `package.json` and adds Git Commit message validation hook.

Now you can check that installation is successful by running:
```console
u:~$ npx mdep --help
mdep <command>

Commands:
  mdep docker          manages docker lifecycle
  mdep test <command>  performs tests in docker

Options:
  --node, -n                  node version to use when building
                                                            [default: "12.13.0"]
  --env, -E                   node environment to build for
                                                         [default: "production"]
  --project, -p               project name where this is used
                                                [default: "microfleet-demo-app"]
  --docker_build_args, --dba  docker build args
  --repository, --repo        docker repository to use   [default: "makeomatic"]
  --version, -v               version of the project to build [default: "1.0.0"]
  --pkg                       package json path
  [default: "/home/pajgo/Desktop/makeomatic/microfleet/create-microfleet-app/pac
                                                                     kage.json"]
  --help                      Show help                                [boolean]

```

## 2. Init Test environment
After `mdep` tool installed, you can initialize your test environment with `babel`, `mocha` and `docker-compose`:

```console
u:~$ npx mdep test init
```
Now if you check your source tree you will see that generic test environment created:

```console
u:~$ git status
...
Untracked files:
  (use "git add <file>..." to include in what will be committed)

	.babelrc                  - Babel configuration
	.nycrc                    - Istanbul Nyc code coverage configuration
	.releaserc.json           - Semantic Release configuration
	test/docker-compose.yml   - docker-compose configuration
	test/mocha.opts           - Mocha configuration
```

The `docker-compose.yml` file already has one service defined. This service will be used to run your tests using the `mdep test run` command. Now you can check that your tests can run in a Dockerized environment using Node.js image defined inside of your `test/docker-compose.yml`. You can find all available `Tester` images on [this page](https://hub.docker.com/r/makeomatic/node/tags).

```console
u:~$ npx mdep test run -t test/demo.js
docker-compose version 1.21.0, build unknown
Found 1 test files
"/usr/bin/docker-compose" -f ./test/docker-compose.yml up -d
The DEBUG variable is not set. Defaulting to a blank string.
Creating network "test_default" with the default driver
Creating tester ... done
"/usr/bin/docker-compose" -f ./test/docker-compose.yml ps -q tester
The DEBUG variable is not set. Defaulting to a blank string.
49b46a101d54361732e096e8a72660af748d92f0e71ec723a3cddc275ef2d40e
docker exec 49b46a101d54361732e096e8a72660af748d92f0e71ec723a3cddc275ef2d40e /bin/sh -c "/src/node_modules/.bin/cross-env NODE_ENV=test /src/node_modules/.bin/nyc --report-dir ./coverage/ /src/node_modules/.bin/mocha  test/demo.js"


  server
    ✓ should be able to start (523ms)
    ✓ should say hello world (132ms)

  2 passing (668ms)


=============================== Coverage summary ===============================
Statements   : 94.12% ( 16/17 )
Branches     : 100% ( 1/1 )
Functions    : 66.67% ( 2/3 )
Lines        : 94.12% ( 16/17 )
================================================================================

Automatically cleaning up after exit

The DEBUG variable is not set. Defaulting to a blank string.
Stopping tester ... done
Removing tester ... done
Removing network test_default
```

## 3. Update your package.json
Now you can save the previous command in your `package.json`:
```json
{
  "scripts": {
    "test:docker": "npx mdep test run -t 'test/**/*.js'"
  },
}
```
After this, you will be able to run your tests using the `yarn test:docker` command.
