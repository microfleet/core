# Structure

Typical Microfleet application structure is:

```sh
.
├── README.md
├── package.json
├── schemas                          # validator schemas
│   ├── account.create.json          # schema for action.create route
│   ├── account.delete.json
│   ├── account.get.json
│   └── account.update.json
├── src                              # application source code
│   ├── actions                      # actions directory
│   │   └── account
│   │       ├── create.js            # action that handles action.create route
│   │       ├── delete.js
│   │       ├── get.js      
│   │       └── update.js
│   ├── auth                         # authentication strategies directory
│   │   ├── index.js                 # exports strategies
│   │   └── strategies
│   │       ├── optional.js          # implements a strategy that allows to access endpoints without authentication          
│   │       └── required.js          # implements a strategy that requires some auth token
│   ├── config.js                    # file that prepends default configuration with configs from /configs dir
│   ├── configs                      # service config directory
│   │   ├── amqp.js                  # amqp plugin config
│   │   ├── app.js                   # custom application config
│   │   ├── http.js                  # http plugin config
│   │   ├── migrations.js            # migrations config
│   │   ├── plugins.js               # plugins list config
│   │   ├── redis.js                 # redis plugin config
│   │   ├── router.js                # router plugin config
│   │   └── validator.js             # validator plugin config
│   ├── index.js                     # main point, requires my-service.js
│   ├── migrations                   # migrations directory 
│   │   └── create-accounts-set.js   # naming is under 
│   ├── my-service.js                # service initialization
│   └── utils                        # some utils, helpers
└── test                             # don't forget about tests
```
