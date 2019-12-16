# Producer Stream

* Does not inform and brings guarantees message delivery

1. Producer always use object mode

## Configs:
Definitelly my configure:
```
    'message.timeout.ms': 2000,
    // 'delivery.timeout.ms': 1, is an alias of message.timeout.ms
    // 'request.timeout.ms': 1, // broker interconnection parameters
    'request.required.acks': 1, // should be max count of replicas
```


# Consumer

* Work only in object mode
