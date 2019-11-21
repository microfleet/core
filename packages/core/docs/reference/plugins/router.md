## Router Plugin

### Info
| Parameter     | Value       |
|---------------|-------------|
| Name          | `router`    |
| Type          | essential   |
| Priority      | 100         |
| Requirements  | [Validator](./validator.md) and [Logger](./logger.md) plugins should be enabled |

### Configure routes folder
Begin with setting up the directory which should serve provide action handlers:
```js
// demo-app/src/config/router.js
exports.router = {
  routes: {
    directory: path.resolve(__dirname, './actions'),
  },  
};
```

```js
//
```
