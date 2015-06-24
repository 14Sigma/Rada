describe('DeleteDoc service', function() {

  'use strict';

  var service,
      getDoc,
      saveDoc,
      broadcast,
      message;

  beforeEach(function() {
    getDoc = sinon.stub();
    saveDoc = sinon.stub();
    broadcast = sinon.stub();
    message = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', function() {
        return {
          get: function() {
            return {
              put: saveDoc,
              get: getDoc
            };
          }
        };
      });
      $provide.factory('$rootScope', function() {
        return { $broadcast: broadcast };
      });
    });
    inject(function(_DeleteDoc_) {
      service = _DeleteDoc_;
    });
  });

  afterEach(function() {
    if (getDoc.restore) {
      getDoc.restore();
    }
    if (saveDoc.restore) {
      saveDoc.restore();
    }
    if (broadcast.restore) {
      broadcast.restore();
    }
  });

  var fakeResolved = function(err, doc) {
    return {
      then: function(callback) {
        if (!err) {
          callback(doc);
        }
        return {
          catch: function(callback) {
            if (err) {
              callback(err);
            }
          }
        };
      }
    };
  };

  it('returns db errors', function(done) {
    getDoc.returns(fakeResolved('errcode1'));
    service('abc', function(err) {
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns audit errors', function(done) {
    getDoc.returns(fakeResolved(null, { _id: 'xyz' }));
    saveDoc.returns(fakeResolved('errcode2'));
    service('abc', function(err) {
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

  it('marks the message deleted', function(done) {
    getDoc.returns(fakeResolved(null, { _id: 'xyz', type: 'data_record' }));
    saveDoc.returns(fakeResolved());
    var expected = { _id: 'xyz', type: 'data_record', _deleted: true };
    service('abc', function(err, actual) {
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(broadcast.calledOnce).to.equal(false);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('broadcasts event if clinic', function(done) {
    getDoc.returns(fakeResolved(null, { _id: 'xyz', type: 'clinic' }));
    saveDoc.returns(fakeResolved());
    var expected = { _id: 'xyz', type: 'clinic', _deleted: true };
    service('abc', function(err, actual) {
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(broadcast.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(broadcast.firstCall.args[0]).to.equal('ContactUpdated');
      chai.expect(broadcast.firstCall.args[1]).to.deep.equal(expected);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('updates clinic deleted person is contact for', function(done) {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+555'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    getDoc
      .onFirstCall().returns(fakeResolved(null, person))
      .onSecondCall().returns(fakeResolved(null, clinic));
    saveDoc.returns(fakeResolved());
    service('a', function(err, actual) {
      chai.expect(getDoc.calledTwice).to.equal(true);
      chai.expect(saveDoc.calledTwice).to.equal(true);
      chai.expect(broadcast.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('a');
      chai.expect(getDoc.secondCall.args[0]).to.equal('b');
      chai.expect(saveDoc.firstCall.args[0].contact).to.equal(null);
      chai.expect(actual._deleted).to.equal(true);
      done();
    });
  });

  it('done update clinic when phone does not match', function(done) {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+666'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    getDoc
      .onFirstCall().returns(fakeResolved(null, person))
      .onSecondCall().returns(fakeResolved(null, clinic));
    saveDoc.returns(fakeResolved());
    service('a', function(err, actual) {
      chai.expect(getDoc.calledTwice).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(broadcast.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('a');
      chai.expect(getDoc.secondCall.args[0]).to.equal('b');
      chai.expect(actual._deleted).to.equal(true);
      done();
    });
  });

});
