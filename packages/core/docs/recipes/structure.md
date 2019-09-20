# Structure

Typical structure is:

```sh
.
├── Dockerfile
├── README.md
├── node_modules
├── package.json
├── schemas
│   ├── account.create.json
│   ├── account.delete.json
│   ├── account.get.json
│   └── account.update.json
├── src
│   ├── actions
│   │   └── account
│   │       ├── delete.js
│   │       ├── get.js
│   │       ├── player-settings
│   │       └── embed-list.js
│   ├── auth
│   │   ├── index.js
│   │   └── strategies
│   │       ├── optional.js
│   │       └── required.js
│   ├── config.js
│   ├── configs
│   │   ├── amqp.js
│   │   ├── app.js
│   │   ├── http.js
│   │   ├── migrations.js
│   │   ├── plugins.js
│   │   ├── redis.js
│   │   ├── router.js
│   │   └── validator.js
│   ├── index.js
│   ├── migrations
│   │   └── create-accounts-set.js
│   ├── static
│   │   └── meta
│   └── utils
├── test
├── yarn-error.log
└── yarn.lock
```
