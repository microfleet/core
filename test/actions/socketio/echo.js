/**
 * @param data
 */
function echoAction(data) {
  this.emit('echo', data);
}

module.exports = {
  handler: echoAction,
  params: {
    type: "object",
    properties: {
      "message": {
        "type": "string"
      }
    }
  }
};
