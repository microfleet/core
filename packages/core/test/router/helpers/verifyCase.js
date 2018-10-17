const assert = require('assert');

function verify(caseObject) {
  return (inspection) => {
    assert(inspection.isFulfilled() || inspection.isRejected(), 'promise is pending');

    if (inspection.isFulfilled()) {
      try {
        assert.equal('success', caseObject.expect);
        caseObject.verify(inspection.value());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.value());
        throw e;
      }

      return null;
    }

    if (inspection.isRejected()) {
      try {
        assert.equal('error', caseObject.expect);
        caseObject.verify(inspection.reason());
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.reason());
        throw e;
      }

      return null;
    }

    throw new Error('unreacheable code');
  };
}

module.exports = verify;
