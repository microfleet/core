const { ActionTransport } = require('@microfleet/core');

function QSAction(request) {
  return {
    response: 'success',
    qs: request.query,
  };
}

QSAction.schema = 'action.qs';
QSAction.transformQuery = (query) => {
  // toFloat
  query.sample *= 1;

  // true/1 as true, rest as false
  switch (query.bool) {
    case 'true':
    case '1':
      query.bool = true;
      break;

    case 'false':
    case '0':
    case undefined:
      query.bool = false;
      break;

    // fail validation
    default:
      query.bool = null;
  }

  return query;
};
QSAction.transports = [ActionTransport.http];
QSAction.transportsOptions = {
  [ActionTransport.http]: {
    methods: ['get'],
  },
};

module.exports = QSAction;
