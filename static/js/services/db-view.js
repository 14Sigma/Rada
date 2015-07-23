var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbView', ['DB',
    function(DB) {

      return function(viewName, options, callback) {
        return DB.get()
          .query('medic/' + viewName, options.params)
          .then(function(results) {
            var meta = {
              total_rows: results.total_rows,
              offset: results.offset
            };
            if (options.params && options.params.include_docs) {
              results = _.pluck(results && results.rows, 'doc');
            }
            if (callback) {
              callback(null, results, meta);
            }
          })
          .catch(function(data) {
            if (callback) {
              callback(new Error(data));
            }
          });
      };
    }
  ]);

}());
