const { expect } = require('chai');
Promise = require('bluebird');

function verify(caseObject) {
  return inspection => {
    expect(inspection.isFulfilled() || inspection.isRejected()).to.be.equals(true);

    if (inspection.isFulfilled()) {
      expect(caseObject.expect).to.be.equals('success');
      caseObject.verify(inspection.value());
      return Promise.resolve();
    }

    if (inspection.isRejected()) {
      expect(caseObject.expect).to.be.equals('error');
      caseObject.verify(inspection.reason());
      return Promise.resolve();
    }

    return Promise.reject();
  }
}

module.exports = verify;
