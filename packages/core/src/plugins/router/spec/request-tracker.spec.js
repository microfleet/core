const sinon = require('sinon');
const assert = require('assert');
const util = require('util');
const EventEmitter = require('events');

const RequestCountTracker = require("../request-tracker");

class FakeService extends EventEmitter {
  constructor(config, router) {
    super();
    this.config = config;
    if (router) {
      this.router = {
        requestCountTracker: new RequestCountTracker.RequestCountTracker(this)
      }
    }
  }

  hasPlugin() {
    return this.router ? true : false
  }
}

describe('router requestCountTracker', () => {
  describe('router enabled', () => {
    let rt;
    let clock;
    let service;

    before('start service', async () => {
      service = new FakeService({}, true);

      rt = service.router.requestCountTracker;

    });

    describe('instance methods', () => {
      before('fake timers', () => {
        clock = sinon.useFakeTimers(Date.now());
      });

      after('restore time', () => {
        clock.restore();
      });

      it('increase connection count', () => {
        rt.increase('http');
        const count = rt.get('http');
        assert(count === 1, 'should increase counter')
      });

      it('decrease connection count', () => {
        rt.decrease('http');
        const count = rt.get('http');
        assert( count === 0, 'should increase counter');

        let error;
        try {
          rt.decrease('http');
        } catch(e) {
          error = e;
        }

        assert.ok(error, 'should be an error');
        assert(error instanceof RangeError);
      });

      it('waits for request count drop and emits event', async () => {
        const stub = sinon.stub();

        rt.increase('http');
        service.stopping = true;
        service.on('plugin:drain:http', stub);

        const decreaseRequestCount = async () => {
          clock.tick(500);
          rt.decrease('http');
        };

        const waitClose = async () => {
          await rt.waitForRequestsToFinish('http');
        };

        await Promise.all([waitClose(), decreaseRequestCount()]);

        assert(stub.called === true, 'should fire event');

      });
    });

    describe('helper methods', () => {
      it('returns request count', () => {
        rt.increase('http');
        const count = RequestCountTracker.getRequestCount(service, 'http');
        assert(count === 1, 'should return request count');
      });

      it('calls instance waitForRequestsToFinish', async () => {
        const rt = service.router.requestCountTracker;
        const stubed = sinon.stub(rt, 'waitForRequestsToFinish');

        await RequestCountTracker.waitForRequestsToFinish(service, 'http');
        assert(stubed.callCount === 1, 'should call instance method using helper');
      });
    });
  });

  describe('no router plugin', () => {
    describe('helper methods', () => {
      it('returns request count as 0', () => {
        const service = new FakeService({}, false);
        const count = RequestCountTracker.getRequestCount(service, 'fooTransport');
        assert(count === 0);
      });
    });
  })
});
