describe('Search service', function() {

  'use strict';

  var service,
      DbGet,
      DbView,
      FormatDataRecord,
      GenerateSearchRequests,
      scope,
      options;

  beforeEach(function() {
    DbView = sinon.stub();
    DbGet = sinon.stub();
    FormatDataRecord = sinon.stub();
    GenerateSearchRequests = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DbView', function() {
        return DbView;
      });
      $provide.factory('DbGet', function() {
        return DbGet;
      });
      $provide.factory('FormatDataRecord', function() {
        return FormatDataRecord;
      });
      $provide.factory('GenerateSearchRequests', function() {
        return GenerateSearchRequests;
      });
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
    scope = {
      filterModel: {
        type: 'reports',
        date: {},
        forms: []
      }
    };
    options = {};
  });

  it('returns error when GenerateSearchRequests errors', function(done) {
    GenerateSearchRequests.throws(new Error('boom'));
    service(scope, options, function(err) {
      chai.expect(err.message).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      done();
    });
  });

  it('returns error when DbView errors when no filters', function(done) {
    GenerateSearchRequests.returns([]);
    DbView.callsArgWith(2, 'boom');
    service(scope, options, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      done();
    });
  });

  it('returns error when FormatDataRecord errors when no filters', function(done) {
    GenerateSearchRequests.returns([]);
    DbView.callsArgWith(2, null, []);
    FormatDataRecord.callsArgWith(1, 'boom');
    service(scope, options, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      done();
    });
  });

  it('handles no rows when no filters', function(done) {
    GenerateSearchRequests.returns([]);
    DbView.callsArgWith(2, null, []);
    FormatDataRecord.callsArgWith(1, null, []);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(0);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0].length).to.equal(0);
      done();
    });
  });

  it('returns results when no filters', function(done) {
    var dbResults = [ { _id: 1 }, { _id: 2 } ];
    var expected = [ { id: 1 }, { id: 2 } ];
    GenerateSearchRequests.returns([]);
    DbView.callsArgWith(2, null, dbResults);
    FormatDataRecord.callsArgWith(1, null, expected);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        targetScope: 'reports',
        params: { include_docs: true, descending: true, limit: 50, skip: 0 }
      });
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0]).to.deep.equal(dbResults);
      done();
    });
  });

  it('paginates results when no filters', function(done) {
    var dbResults = [ { _id: 1 }, { _id: 2 } ];
    var expected = [ { id: 1 }, { id: 2 } ];
    options = { limit: 10, skip: 5 };
    GenerateSearchRequests.returns([]);
    DbView.callsArgWith(2, null, dbResults);
    FormatDataRecord.callsArgWith(1, null, expected);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        targetScope: 'reports',
        params: { include_docs: true, descending: true, limit: 10, skip: 5 }
      });
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0]).to.deep.equal(dbResults);
      done();
    });
  });

  it('returns results when one filter', function(done) {
    var getResult = [ { id: 'a' }, { id: 'b' } ];
    var formatResult = [ { id: 'a', name: 'a' }, { id: 'b', name: 'b' } ];
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] });
    DbGet.callsArgWith(2, null, getResult);
    FormatDataRecord.callsArgWith(1, null, formatResult);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('get_stuff');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        targetScope: 'reports',
        params: { key: [ 'a' ] }
      });
      chai.expect(DbGet.calledOnce).to.equal(true);
      chai.expect(DbGet.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0]).to.deep.equal(getResult);
      done();
    });
  });

  it('removes duplicates before pagination', function(done) {
    var getResult = [ { id: 'a' }, { id: 'b' } ];
    var formatResult = [ { id: 'a', name: 'a' }, { id: 'b', name: 'b' } ];
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'a', value: 1 } ] });
    DbGet.callsArgWith(2, null, getResult);
    FormatDataRecord.callsArgWith(1, null, formatResult);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('get_stuff');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        targetScope: 'reports',
        params: { key: [ 'a' ] }
      });
      chai.expect(DbGet.calledOnce).to.equal(true);
      chai.expect(DbGet.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0]).to.deep.equal(getResult);
      done();
    });
  });

  it('sorts and limits results', function(done) {
    options.limit = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 5; j < 15; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    DbGet.callsArgWith(2, null, []);
    FormatDataRecord.callsArgWith(1, null, []);
    service(scope, options, function() {
      chai.expect(DbGet.calledOnce).to.equal(true);
      chai.expect(DbGet.args[0][0].length).to.equal(10);
      chai.expect(DbGet.args[0][0]).to.deep.equal(expected);
      done();
    });
  });

  it('sorts and skips results', function(done) {
    options.skip = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 0; j < 5; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    DbGet.callsArgWith(2, null, []);
    FormatDataRecord.callsArgWith(1, null, []);
    service(scope, options, function() {
      chai.expect(DbGet.calledOnce).to.equal(true);
      chai.expect(DbGet.args[0][0].length).to.equal(5);
      chai.expect(DbGet.args[0][0]).to.deep.equal(expected);
      done();
    });
  });

  it('returns results when multiple filters', function(done) {
    var getResult = [ { id: 'a' }, { id: 'b' } ];
    var formatResult = [ { id: 'a', name: 'a' }, { id: 'b', name: 'b' } ];
    GenerateSearchRequests.returns([
      { view: 'get_stuff', params: { key: [ 'a' ] } },
      { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
    ]);
    DbView.onCall(0).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] });
    DbView.onCall(1).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'd', value: 4 } ] });
    DbGet.callsArgWith(2, null, getResult);
    FormatDataRecord.callsArgWith(1, null, formatResult);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledTwice).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('get_stuff');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        targetScope: 'reports',
        params: { key: [ 'a' ] }
      });
      chai.expect(DbView.args[1][0]).to.equal('get_moar_stuff');
      chai.expect(DbView.args[1][1]).to.deep.equal({
        targetScope: 'reports',
        params: { startkey: [ {} ] }
      });
      chai.expect(DbGet.calledOnce).to.equal(true);
      chai.expect(DbGet.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      chai.expect(FormatDataRecord.args[0][0]).to.deep.equal(getResult);
      done();
    });
  });

  it('returns error when one of the filters errors', function(done) {
    GenerateSearchRequests.returns([
      { view: 'get_stuff', params: { key: [ 'a' ] } },
      { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
    ]);
    DbView.onCall(0).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] });
    DbView.onCall(1).callsArgWith(2, 'boom');
    service(scope, options, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledTwice).to.equal(true);
      done();
    });
  });

  it('does not get when no ids', function(done) {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [ ] });
    FormatDataRecord.callsArgWith(1, null, [ ]);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([]);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbGet.calledOnce).to.equal(false);
      chai.expect(FormatDataRecord.calledOnce).to.equal(true);
      done();
    });
  });

  it('debounces if the same query is executed twice', function() {
    var formatResult =  [ { id: 'a', name: 'a' } ];
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
    DbView.callsArgWithAsync(2, null, { rows: [ { id: 'a', value: 1 } ] });
    DbGet.callsArgWithAsync(2, null, [ { id: 'a' } ]);
    FormatDataRecord.callsArgWith(1, null, formatResult);
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult);
    });
    service(scope, {}, function() {
      // this callback should never be called
      chai.expect(true).to.equal(false);
    });
  });

  it('does not debounce different queries', function() {
    var formatResult1 =  [ { id: 'a', name: 'a' } ];
    var formatResult2 =  [ { id: 'b', name: 'b' } ];
    GenerateSearchRequests
      .onFirstCall().returns([ { view: 'get_stuff', params: { id: 'a' } } ])
      .onSecondCall().returns([ { view: 'get_stuff', params: { id: 'b' } } ]);
    DbView
      .onFirstCall().callsArgWith(2, null, { rows: [ { id: 'a', value: 1 } ] })
      .onSecondCall().callsArgWith(2, null, { rows: [ { id: 'b', value: 2 } ] });
    DbGet
      .onFirstCall().callsArgWith(2, null, [ { id: 'a' } ])
      .onSecondCall().callsArgWith(2, null, [ { id: 'b' } ]);
    FormatDataRecord
      .onFirstCall().callsArgWith(1, null, formatResult1)
      .onSecondCall().callsArgWith(1, null, formatResult2);
    var finished = 0;
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult1);
      chai.expect(finished++).to.equal(0);
    });
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult2);
      chai.expect(finished++).to.equal(1);
    });
  });


  it('does not debounce subsequent queries', function(done) {
    var formatResult =  [ { id: 'a', name: 'a' } ];
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 } ] });
    DbGet.callsArgWith(2, null, [ { id: 'a' } ]);
    FormatDataRecord.callsArgWith(1, null, formatResult);
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(formatResult);
      service(scope, {}, function(err, actual) {
        chai.expect(err).to.equal(null);
        chai.expect(actual).to.deep.equal(formatResult);
        done();
      });
    });
  });

});
