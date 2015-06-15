var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['DbGet', 'DbView', 'GenerateSearchRequests',
    function(DbGet, DbView, GenerateSearchRequests) {

      var _currentQuery;

      var debounce = function(requests) {
        var queryString = JSON.stringify(requests);
        if (queryString === _currentQuery) {
          // debounce as same query already running
          return true;
        }
        _currentQuery = queryString;
        return false;
      };

      var getPage = function(rows, options) {
        var start;
        var end;
        if (options.type === 'reports') {
          // descending
          end = rows.length - options.skip;
          start = end - options.limit;
        } else {
          // ascending
          start = options.skip;
          end = start + options.limit;
        }
        return _.pluck(_.sortBy(rows, 'value').slice(start, end), 'id');
      };

      var getIntersection = function(responses) {
        var intersection = responses.pop().rows;
        intersection = _.uniq(intersection, 'id');
        _.each(responses, function(response) {
          intersection = _.reject(intersection, function(row) {
            return !_.findWhere(response.rows, { id: row.id });
          });
        });
        return intersection;
      };

      var view = function(request, options, callback) {
        DbView(
          request.view,
          { targetScope: options.type, params: request.params },
          callback
        );
      };

      var filter = function(requests, options, callback) {
        async.map(requests, _.partial(view, _, options), function(err, responses) {
          if (err) {
            return callback(err);
          }
          var intersection = getIntersection(responses, options);
          var page = getPage(intersection, options);
          if (!page.length) {
            callback(null, []);
          }
          DbGet(page, { targetScope: options.type }, callback);
        });
      };

      var execute = function(requests, options, callback) {
        if (requests.length === 1 && requests[0].params.include_docs) {
          // filter not required - just get the view directly
          _.defaults(requests[0].params, {
            limit: options.limit,
            skip: options.skip
          });
          view(requests[0], options, callback);
        } else {
          // filtering
          filter(requests, options, callback);
        }
      };

      var generateRequests = function($scope, callback) {
        var requests;
        try {
          requests = GenerateSearchRequests($scope);
        } catch(e) {
          return callback(e);
        }
        if (debounce(requests)) {
          return;
        }
        callback(null, requests);
      };

      return function($scope, options, callback) {
        _.defaults(options, {
          limit: 50,
          skip: 0,
          type: $scope.filterModel.type
        });
        generateRequests($scope, function(err, requests) {
          if (err) {
            return callback(err);
          }
          execute(requests, options, function(err, results) {
            _currentQuery = null;
            callback(err, results);
          });
        });
      };
    }
  ]);

}());