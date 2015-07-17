var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var endOfAlphabet = '\ufff0';

  inboxServices.factory('GenerateSearchRequests', [
    function() {

      var reportedDate = function($scope, type) {
        var view = type.views.reportedDate;
        if (!view) {
          return;
        }
        if ($scope.filterModel.date.to || $scope.filterModel.date.from) {
          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add(1, 'days');
          var from = moment($scope.filterModel.date.from || 0);
          return {
            view: view,
            params: {
              startkey: [ from.valueOf() ],
              endkey: [ to.valueOf() ]
            }
          };
        }
      };

      var form = function($scope, type) {
        var view = type.views.form;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.forms;
        if (selected.length > 0 && selected.length < $scope.forms.length) {
          var keys = _.map(selected, function(form) {
            return [ form.code ];
          });
          return {
            view: view,
            params: {
              keys: keys
            }
          };
        }
      };

      var validity = function($scope, type) {
        var view = type.views.validity;
        if (!view) {
          return;
        }
        var validity = $scope.filterModel.valid;
        if (validity === true || validity === false) {
          return {
            view: view,
            params: {
              key: [ validity ]
            }
          };
        }
      };

      var verification = function($scope, type) {
        var view = type.views.verification;
        if (!view) {
          return;
        }
        var verification = $scope.filterModel.verified;
        if (verification === true || verification === false) {
          return {
            view: view,
            params: {
              key: [ verification ]
            }
          };
        }
      };

      var place = function($scope, type) {
        var view = type.views.place;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.facilities;
        if (selected.length > 0 && selected.length < $scope.facilitiesCount) {
          var keys = _.map(selected, function(facility) {
            return [ facility ];
          });
          return {
            view: view,
            params: {
              keys: keys
            }
          };
        }
      };

      var freetext = function($scope, type) {
        var view = type.views.freetext;
        if (!view) {
          return;
        }
        var freetext = $scope.filterQuery.value;
        if (freetext) {
          freetext = freetext.toLowerCase();
          var params = {};
          if (freetext.indexOf(':') !== -1) {
            // use exact match
            params.keys = _.map(freetext.split(/\s+/), function(word) {
              return [ word ];
            });
          } else {
            // use starts with
            params.startkey = [ freetext ];
            params.endkey = [ freetext + endOfAlphabet ];
          }
          return {
            view: view,
            params: params
          };
        }
      };

      var documentType = function($scope, type) {
        var view = type.views.documentType;
        if (!view) {
          return;
        }
        var selected = $scope.filterModel.contactTypes;
        var numberOfTypes = 4;
        if (selected.length > 0 && selected.length < numberOfTypes) {
          var keys = _.map(selected, function(t) {
            return [ t ];
          });
          return {
            view: type.views.documentType,
            params: {
              keys: keys
            }
          };
        }
      };

      var types = {
        reports: {
          getUnfiltered: function() {
            return {
              view: 'reports_by_date',
              params: {
                include_docs: true,
                descending: true
              }
            };
          },
          views: {
            reportedDate: 'reports_by_date',
            form: 'reports_by_form',
            validity: 'reports_by_validity',
            verification: 'reports_by_verification',
            place: 'reports_by_place',
            freetext: 'reports_by_freetext'
          }
        },
        contacts: {
          getUnfiltered: function() {
            return {
              view: 'contacts_by_name',
              params: {
                include_docs: true
              }
            };
          },
          views: {
            place: 'contacts_by_place',
            freetext: 'contacts_by_freetext',
            documentType: 'contacts_by_type'
          }
        }
      };

      var getRequests = function($scope, type) {
        var requests = [];
        requests.push(reportedDate($scope, type));
        requests.push(form($scope, type));
        requests.push(validity($scope, type));
        requests.push(verification($scope, type));
        requests.push(place($scope, type));
        requests.push(freetext($scope, type));
        requests.push(documentType($scope, type));
        requests = _.compact(requests);
        return requests.length ? requests : [ type.getUnfiltered() ];
      };

      return function($scope) {
        var type = types[$scope.filterModel.type];
        if (!type) {
          throw new Error('Unknown type: ' + $scope.filterModel.type);
        }
        return getRequests($scope, type);
      };
    }
  ]);
}());