(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var updateParent = function(DB, doc, callback) {
    if (doc.type === 'person' && doc.parent && doc.parent._id) {
      DB.get()
        .get(doc.parent._id)
        .then(function(parent) {
          if (parent.contact.phone !== doc.phone) {
            return callback();
          }
          parent.contact = null;
          DB.get()
            .put(parent)
            .then(function() {
              callback();
            })
            .catch(function(err) {
              callback(err);
            });
        })
        .catch(function(err) {
          if (err.reason === 'deleted') {
            return callback();
          }
          return callback(err);
        });
    } else {
      callback();
    }
  };

  inboxServices.factory('DeleteDoc', ['$rootScope', 'DB',
    function($rootScope, DB) {
      return function(docId, callback) {
        DB.get()
          .get(docId)
          .then(function(doc) {
            updateParent(DB, doc, function(err) {
              if (err) {
                return callback(err);
              }
              doc._deleted = true;
              DB.get()
                .put(doc)
                .then(function() {
                  if (doc.type === 'clinic' ||
                      doc.type === 'health_center' ||
                      doc.type === 'district_hospital' ||
                      doc.type === 'person') {
                    $rootScope.$broadcast('ContactUpdated', doc);
                  }
                  callback(null, doc);
                })
                .catch(function(err) {
                  return callback(err);
              });
            });
          })
          .catch(function(err) {
            return callback(err);
          });
      };
    }
  ]);

}());
