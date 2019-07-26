### Maintenance mode 

There are many situations when your service would need to set a maintenance mode. Examples are:
- making database changes, migrations
- reduce high load due to write overload
- disable some actions for various reasons

To set this feature, you need:
1) Enable maintenance mode in the configuration:
```js
module.exports = {
  name: 'servicename',
  maintenanceMode: true,
  //...
}
```
2) Modify actions which will be available in maintenance mode by passing `readonly` flag:
```js
async function actionHandler(request) {
  // 
}

module.exports = handler
module.exports.readonly = true

```
3) Restart your service


In this actions without according flag (or parent actions which trigger such actions) will return http status code `418 Server Maintenance`.
