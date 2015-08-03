var utils = require('kujua-utils'),
    feedback = require('feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    sendMessage = require('../modules/send-message'),
    tour = require('../modules/tour'),
    modal = require('../modules/modal'),
    format = require('../modules/format'),
    guidedSetup = require('../modules/guided-setup');

require('moment/locales');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$window', '$scope', '$translate', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'Facility', 'FacilityHierarchy', 'Form', 'Settings', 'UpdateSettings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'UserDistrict', 'Verified', 'DeleteDoc', 'UpdateFacility', 'DownloadUrl', 'SetLanguageCookie', 'CountMessages', 'ActiveRequests', 'BaseUrlService', 'Changes', 'User', 'DBSync', 'ConflictResolution', 'Session', 'APP_CONFIG', 'DB',
    function ($window, $scope, $translate, $rootScope, $state, $stateParams, $timeout, translateFilter, Facility, FacilityHierarchy, Form, Settings, UpdateSettings, Contact, Language, ReadMessages, UpdateUser, SendMessage, UserDistrict, Verified, DeleteDoc, UpdateFacility, DownloadUrl, SetLanguageCookie, CountMessages, ActiveRequests, BaseUrlService, Changes, User, DBSync, ConflictResolution, Session, APP_CONFIG, db) {

      Session.init();
      DBSync();
      ConflictResolution();

      $scope.loadingContent = false;
      $scope.error = false;
      $scope.errorSyntax = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.forms = [];
      $scope.facilities = [];
      $scope.items = [];
      $scope.totalItems = undefined;
      $scope.selected = undefined;
      $scope.filterQuery = { value: undefined };
      $scope.analyticsModules = undefined;
      $scope.version = APP_CONFIG.version;

      $scope.baseUrl = BaseUrlService();

      $scope.logout = function() {
        Session.logout();
      };

      $scope.setFilterQuery = function(query) {
        if (query) {
          $scope.filterQuery.value = query;
        }
      };

      $scope.setAnalyticsModules = function(modules) {
        $scope.analyticsModules = modules;
      };

      $scope.setSelectedModule = function(module) {
        $scope.filterModel.module = module;
      };

      var clearSelectedTimer;

      $scope.setSelected = function(selected) {
        $timeout.cancel(clearSelectedTimer);
        $scope.loadingContent = false;
        var refreshing = (selected && selected._id) === ($scope.selected && $scope.selected._id);
        if (selected) {
          $scope.selected = selected;
          $timeout(function() {
            $scope.showContent = true;
            if (!refreshing) {
              $timeout(function() {
                $('.item-body').scrollTop(0);
              });
            }
          });
        } else if($scope.selected) {
          $scope.showContent = false;
          if ($('#back').is(':visible')) {
            clearSelectedTimer = $timeout(function() {
              $scope.selected = undefined;
            }, 500);
          } else {
            $scope.selected = undefined;
          }
        }
      };

      $scope.select = function(id) {
        if ($stateParams.id === id) {
          // message already set - make sure we're showing content
          if ($scope.filterModel.type === 'messages') {
            return;
          }
          var message = _.findWhere($scope.items, { _id: id });
          if (message) {
            return $scope.setSelected(message);
          }
          $state.reload();
          $scope.$broadcast('query');
        } else if (id) {
          $state.go($scope.filterModel.type + '.detail', { id: id });
        } else {
          $state.go($scope.filterModel.type);
        }
      };

      $scope.setLoadingContent = function(id) {
        $scope.loadingContent = id;
        $timeout(function() {
          $scope.showContent = true;
        });
      };

      var removeDeletedMessages = function(messages) {
        var existingKey;
        var checkExisting = function(updated) {
          return existingKey === updated.key[1];
        };
        for (var i = $scope.items.length - 1; i >= 0; i--) {
          existingKey = $scope.items[i].key[1];
          if (!_.some(messages, checkExisting)) {
            $scope.items.splice(i, 1);
          }
        }
      };

      var mergeUpdatedMessages = function(messages) {
        _.each(messages, function(updated) {
          var match = _.find($scope.items, function(existing) {
            return existing.key[1] === updated.key[1];
          });
          if (match) {
            if (!_.isEqual(updated.value, match.value)) {
              match.value = updated.value;
            }
          } else {
            $scope.items.push(updated);
          }
        });
      };

      $scope.setMessages = function(options) {
        options = options || {};
        if (options.changes) {
          removeDeletedMessages(options.messages);
          mergeUpdatedMessages(options.messages);
        } else {
          $scope.items = options.messages || [];
        }
      };

      $scope.setReports = function(reports) {
        $scope.items = reports || [];
      };

      $scope.setContacts = function(contacts) {
        $scope.items = contacts || [];
      };

      $scope.setTasks = function(tasks) {
        $scope.items = tasks || [];
      };

      $scope.isRead = function(message) {
        return _.contains(message.read, Session.userCtx().name);
      };

      $scope.permissions = {
        admin: utils.isUserAdmin(Session.userCtx()),
        nationalAdmin: utils.isUserNationalAdmin(Session.userCtx()),
        districtAdmin: utils.isUserDistrictAdmin(Session.userCtx()),
        district: undefined,
        canExport: utils.hasPerm(Session.userCtx(), 'can_export_messages') ||
                   utils.hasPerm(Session.userCtx(), 'can_export_forms')
      };

      $scope.readStatus = { forms: 0, messages: 0 };

      $scope.filterModel = {
        type: 'messages',
        forms: [],
        facilities: [],
        contactTypes: [],
        valid: undefined,
        verified: undefined,
        date: { }
      };

      $scope.resetFilterModel = function() {
        $scope.filterQuery.value = '';
        $scope.filterModel.forms = [];
        $scope.filterModel.facilities = [];
        $scope.filterModel.contactTypes = [];
        $scope.filterModel.valid = undefined;
        $scope.filterModel.date = {};

        $('.filter.multidropdown').each(function() {
          $(this).multiDropdown().reset();
        });

        $scope.$broadcast('query');
      };

      $scope.download = function() {
        DownloadUrl($scope, $scope.filterModel.type, function(err, url) {
          if (err) {
            return console.log(err);
          }
          $window.location.href = url;
        });
      };

      $scope.removeContact = function(contact) {
        $scope.items = _.filter($scope.items, function(i) {
            return i._id !== contact._id; });
      };

      $scope.$on('ContactUpdated', function() {
        $scope.updateAvailableFacilities();
      });

      $scope.updateAvailableFacilities = function() {
        UserDistrict(function(err, district) {
          if (err) {
            return console.log('Error fetching district', err);
          }
          FacilityHierarchy(district, function(err, hierarchy, total) {
            if (err) {
              return console.log('Error loading facilities', err);
            }
            $scope.facilities = hierarchy;
            $scope.facilitiesCount = total;
          });
          Facility({ district: district, types: [ 'person' ] }, function(err, facilities) {
            if (err) {
              return console.log('Failed to retrieve facilities', err);
            }
            function formatResult(doc) {
              return doc && format.contact(doc);
            }
            $('.update-facility [name=facility]').select2({
              id: function(doc) {
                return doc._id;
              },
              width: '100%',
              escapeMarkup: function(m) {
                return m;
              },
              formatResult: formatResult,
              formatSelection: formatResult,
              initSelection: function (element, callback) {
                var e = element.val();
                if (!e) {
                  return callback();
                }
                var row = _.findWhere(facilities, { _id: e });
                if (!row) {
                  return callback();
                }
                callback(row);
              },
              query: function(options) {
                var terms = options.term.toLowerCase().split(/\s+/);
                var matches = _.filter(facilities, function(doc) {
                  var contact = doc.contact;
                  var name = contact && contact.name;
                  var phone = contact && contact.phone;
                  var tags = [ doc.name, name, phone ].join(' ').toLowerCase();
                  return _.every(terms, function(term) {
                    return tags.indexOf(term) > -1;
                  });
                });
                options.callback({ results: matches });
              },
              sortResults: function(results) {
                results.sort(function(a, b) {
                  var aName = formatResult(a).toLowerCase();
                  var bName = formatResult(b).toLowerCase();
                  return aName.localeCompare(bName);
                });
                return results;
              }
            });
          });
        });
      };

      $scope.updateReadStatus = function () {
        ReadMessages({
          user: Session.userCtx().name,
          district: $scope.permissions.district,
          targetScope: 'messages'
        }, function(err, data) {
          if (err) {
            return console.log(err);
          }
          $scope.readStatus = data;
        });
      };

      UserDistrict(function(err, district) {
        if (err) {
          console.log('Error fetching user district', err);
          if (err.message !== 'Not logged in') {
            $('body').html(err);
          }
          return;
        }
        $scope.permissions.district = district;
        $scope.updateReadStatus();
      });

      $scope.setupSendMessage = function() {
        sendMessage.init(Settings, Contact, translateFilter);
      };

      Form(function(err, forms) {
        if (err) {
          return console.log('Failed to retrieve forms', err);
        }
        $scope.forms = forms;
      });

      $scope.setupGuidedSetup = function() {
        guidedSetup.init(Settings, UpdateSettings, translateFilter);
        modalsInited.guidedSetup = true;
        showModals();
      };

      $scope.setupWelcome = function() {
        modalsInited.welcome = true;
        showModals();
      };

      $scope.setupUserLanguage = function() {
        $('#user-language').on('click', '.horizontal-options a', function(e) {
          e.preventDefault();
          var elem = $(this);
          elem.closest('.horizontal-options')
            .find('.selected')
            .removeClass('selected');
          elem.addClass('selected');
        });
        $('#user-language .btn-primary').on('click', function(e) {
          e.preventDefault();
          var btn = $(this);
          btn.addClass('disabled');
          var selected = $(this).closest('.modal-content')
                                .find('.selected')
                                .attr('data-value');
          var id = 'org.couchdb.user:' + Session.userCtx().name;
          UpdateUser(id, { language: selected }, function(err) {
            btn.removeClass('disabled');
            if (err) {
              return console.log('Error updating user', err);
            }
            $('#user-language').modal('hide');
          });
        });
        modalsInited.userLanguage = true;
        showModals();
      };

      $scope.changeLanguage = function(code) {
        moment.locale([code, 'en']);
        $translate.use(code);
        SetLanguageCookie(code);
      };

      var startupModals = [
        // select language
        {
          required: function(settings, user) {
            return !user.language;
          },
          render: function(callback) {
            $('#user-language').modal('show');
            $('#user-language').on('hide.bs.modal', callback);
          }
        },
        // welcome screen
        {
          required: function(settings) {
            return !settings.setup_complete;
          },
          render: function(callback) {
            $('#welcome').modal('show');
            $('#welcome').on('hide.bs.modal', callback);
          }
        },
        // guided setup
        {
          required: function(settings) {
            return !settings.setup_complete;
          },
          render: function(callback) {
            $('#guided-setup').modal('show');
            $('#guided-setup').on('hide.bs.modal', callback);
            UpdateSettings({ setup_complete: true }, function(err) {
              if (err) {
                console.log('Error marking setup_complete', err);
              }
            });
          }
        },
        // tour
        {
          required: function(settings, user) {
            return !user.known;
          },
          render: function() {
            tour.start('intro', translateFilter);
            var id = 'org.couchdb.user:' + Session.userCtx().name;
            UpdateUser(id, { known: true }, function(err) {
              if (err) {
                console.log('Error updating user', err);
              }
            });
          }
        },
      ];

      var filteredModals;
      var modalsInited = {
        guidedSetup: false,
        welcome: false,
        userLanguage: false
      };

      var showModals = function() {
        if (filteredModals && _.every(_.values(modalsInited))) {
          // render the first modal and recursively show the rest
          if (filteredModals.length) {
            filteredModals.shift().render(function() {
              showModals(filteredModals);
            });
          }
        }
      };

      var editUserModel = {};

      $scope.editCurrentUserPrepare = function() {
        $rootScope.$broadcast('EditUserInit', editUserModel);
      };

      $scope.$on('UsersUpdated', function(e, userId) {
        if (editUserModel.id === userId) {
          updateEditUserModel();
        }
      });

      var updateEditUserModel = function(callback) {
        User(function(err, user) {
          if (err) {
            return console.log('Error getting user', err);
          }
          editUserModel = {
            id: user._id,
            rev: user._rev,
            name: user.name,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            language: { code: user.language }
          };
          if (callback) {
            callback(user);
          }
        });
      };

      Settings(function(err, settings) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        $scope.enabledLocales = _.reject(settings.locales, function(locale) {
          return !!locale.disabled;
        });
        updateEditUserModel(function(user) {
          filteredModals = _.filter(startupModals, function(modal) {
            return modal.required(settings, user);
          });
          showModals();
        });
      });

      moment.locale(['en']);

      Language(function(err, language) {
        if (err) {
          return console.log('Error loading language', err);
        }
        moment.locale([language, 'en']);
        $translate.use(language);
      });

      $scope.sendMessage = function(event) {
        sendMessage.validate(event.target, function(recipients, message) {
          var pane = modal.start($(event.target).closest('.message-form'));
          SendMessage(recipients, message)
            .then(function() {
              $('#message-footer').removeClass('sending');
              $('#message-footer textarea').val('');
              pane.done();
            })
            .catch(function(err) {
              pane.done(translateFilter('Error sending message'), err);
            });
        });
      };

      $scope.verify = function(verify) {
        if ($scope.selected.form) {
          Verified($scope.selected._id, verify, function(err) {
            if (err) {
              console.log('Error verifying message', err);
            }
          });
        }
      };

      var deleteMessageId;

      $scope.deleteDoc = function(id) {
        $('#delete-confirm').modal('show');
        deleteMessageId = id;
      };

      $scope.deleteDocConfirm = function() {
        var pane = modal.start($('#delete-confirm'));
        if (deleteMessageId) {
          DeleteDoc(deleteMessageId, function(err) {
            pane.done(translateFilter('Error deleting document'), err);
          });
        } else {
          pane.done(translateFilter('Error deleting document'), 'No deleteMessageId set');
        }
      };

      $scope.updateFacility = function(modalSelecter) {
        var $modal = $(modalSelecter || '#update-facility');
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
          $modal.find('.modal-footer .note')
            .text(translateFilter('Please select a facility'));
          return;
        }
        var pane = modal.start($modal);
        UpdateFacility($scope.selected._id, facilityId, function(err) {
          pane.done(translateFilter('Error updating facility'), err);
        });
      };

      $scope.updateReport = function() {
        if(!$scope.report_form) {
          $scope.updateFacility('#edit-report');
          return;
        }
        var form = $scope.report_form.form,
            formName = $scope.report_form.formName,
            docId = $scope.report_form.docId,
            $modal = $('#edit-report'),
            facilityId = $modal.find('[name=facility]').val(),
            xformDataAsJson = function(xml) {
              return {
                form: formName,
                type: 'data_record',
                from: 'user:TODO',
                reported_date: Date.now(),
                content_type: 'xml',
                content: xml,
              };
            };
        form.validate();
        if(form.isValid()) {
          console.log('Form content is valid!  Saving and resetting.');
          var record = xformDataAsJson(form.getDataStr()),
              $submit = $('.edit-report-dialog .btn.submit'),
              contact = null,
              updatedDoc = null;
          $submit.prop('disabled', true);

          // update an existing doc.  For convenience, get the latest version
          // and then modify the content.  This will avoid most concurrent
          // edits, but is not ideal.  TODO update write failure to handle
          // concurrent modifications.
          db.get().get(facilityId).then(function(facility) {
            contact = facility;
            return db.get().get(docId);
          }).then(function(doc) {
            doc.content = record.content;
            doc.contact = contact;
            updatedDoc = doc;
            return db.get().put(doc);
          }).then(function() {
            $scope.selected = updatedDoc;
              // TODO ideally this would be in a `finally` handler rather than duplicated in `then()` and `catch()`
              $submit.prop('disabled', false);
            $('#edit-report').modal('hide');
            form.resetView();
            $('#edit-report .form-wrapper').hide();
          }).catch(function(err) {
              // TODO ideally this would be in a `finally` handler rather than duplicated in `then()` and `catch()`
              $submit.prop('disabled', false);
            console.log('Error submitting form data: ' + err);
          });
        }
      };

        setTimeout(function() {
                window.medic_config = {
                  app_root:    window.location.protocol + '//' + window.location.host,
                  db_root:     window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname),
                  db_name:     /^\/[^\/]+/.exec(window.location.pathname),
                  enketo_root: window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname) + '/_design/medic/static/dist/enketo',
                };

                console.log('Requesting remote script...');
                jQuery.getScript(medic_config.enketo_root + '/js/medic-enketo-offline-SNAPSHOT.min.js', function() {
                  setTimeout(function() {
                    console.log('Script fetched; setting up enketo...');

                    requirejs.config({
                      shim: {
                        'jquery': {
                          exports: 'jQuery',
                        },
                        'widget/date/bootstrap3-datepicker/js/bootstrap-datepicker': {
                          deps: [ 'jquery' ],
                          exports: 'jQuery.fn.datepicker',
                        },
                        'widget/time/bootstrap3-timepicker/js/bootstrap-timepicker': {
                          deps: [ 'jquery' ],
                          exports: 'jQuery.fn.timepicker',
                        },
                        'leaflet': {
                          exports: 'L',
                        },
                      }
                    });

                    define('jquery', function() {
                      return jQuery;
                    });

                    requirejs(['jquery'], function() {
                      function log(message) {
                        console.log('LOG | ' + message);
                        $('#log .content').append('<pre>' + message + '</p>');
                        while($('#log .content').children().length > 5) {
                            $('#log .content pre:first').remove();
                        }
                      };
                      log('Scripts loaded.');

                      log('Requiring enketo form...');
                      requirejs(['enketo-js/Form'], function(Form) {
                        log('Enketo loaded.');

                        var showForm = function(docId, formName, formHtml, formModel, formData) {
                          var form, formContainer, formWrapper,
                              init = function() {
                                var loadErrors;
                                // TODO check if it's OK to attach to `$scope` like this
                                $scope.report_form = { formName:formName, docId:$scope.selected._id };
                                $scope.report_form.form = form = new Form('.edit-report-dialog .form-wrapper form', { modelStr:formModel, instanceStr:formData });
                                loadErrors = form.init();
                                if(loadErrors && loadErrors.length > 0) log('loadErrors = ' + loadErrors.toString());

                                $('#edit-report .form-wrapper').show();
                              };

                          log('Adding form to DOM...');
                          formWrapper = $('.edit-report-dialog .form-wrapper');
                          formWrapper.show();
                          formContainer = formWrapper.find('.container');
                          formContainer.empty();

                          formContainer.append(formHtml);

                          log('Attempting to load form with data of type: ' + (typeof formModel));
                          console.log('form:\n' + formModel);
                          init();
                        };

                        var processors = {
                          html: { processor:new XSLTProcessor() },
                          model: { processor:new XSLTProcessor() } };
                        $.get(medic_config.enketo_root + '/forms/openrosa2html5form.xsl').done(function(doc) {
                          processors.html.processor.importStylesheet(doc);
                          processors.html.loaded = true;
                        });
                        $.get(medic_config.enketo_root + '/forms/openrosa2xmlmodel.xsl').done(function(doc) {
                          processors.model.processor.importStylesheet(doc);
                          processors.model.loaded = true;
                        });

                        var loadForm = function(docId, name, url, formInstanceData) {
                          if(!processors.html.loaded || !processors.model.loaded) {
                            return log('Not all processors are loaded yet.');
                          }

                          log('TODO: we should be getting the form from `db`, not an ajax request.');
                          log('Loading form: ' + url + '...');
                          $.ajax(url).done(function(data) {
                            log('Loaded form.');
                            var doc = data,
                                html = processors.html.processor.transformToDocument(doc),
                                model = processors.model.processor.transformToDocument(doc);

                            console.log('XML');
                            console.log('---');
                            console.log(new XMLSerializer().serializeToString(model));

                            console.log('XML');
                            console.log('---');
                            console.log(new XMLSerializer().serializeToString(html));

                            showForm(docId, name,
                                html.documentElement.innerHTML,
                                model.documentElement.innerHTML,
                                formInstanceData);
                          });
                        };

                        var getFormUrl = function(formId) {
                          // TODO we should probably be (i) getting the forms from
                          // pouch directly, and (ii) storing the form by `formId`
                          // in the db, i.e. dosages.xml should be stored as frm:DSG
                          // In that case, this mapping would be unnecessary.  If we
                          // really wanted to keep this mapping in the short term,
                          // we can get a list of xforms from `api`, parse it, and
                          // do this id->filename lookup there.
                          var fileName = function() {
                            switch(formId) {
                              case 'DSG': return 'dosages';
                              case 'PNT': return 'treatments';
                              case 'PREG': return 'pregnancy';
                              case 'HH': return 'households';
                              case 'EDCD_H01': return 'hospital-survey';
                              case 'V': return 'visit-report';
                            }
                          };
                          return medic_config.app_root + '/api/v1/forms/' + fileName() + '.xml';
                        };

                        window.loadFormFor = function(docId, dataContainerSelecter) {
                          var formData = $(dataContainerSelecter).text(),
                              xml = $.parseXML(formData),
                              formId = xml.evaluate('//./@id', xml).iterateNext().value, // FIXME this code gets the `id` attribute of the root element.  But it sure is ugly.
                              url = getFormUrl(formId);
                          console.log('Should load from ' + url);
                          loadForm(docId, formId, url, formData);
                        };
                      });
                    });
                  }, 1000);
                });
        }, 1000);



      $scope.edit = function(record) {
        if ($scope.filterModel.type === 'reports') {
          var val = (record.contact && record.contact._id) || '';
          $('#edit-report [name=facility]').select2('val', val);
          $('#edit-report').modal('show');
          if($scope.selected.content_type === 'xml') {
            loadFormFor($scope.selected._id, '.raw-report-content p');
          }
        } else {
          $rootScope.$broadcast('EditContactInit', record);
        }
      };

      $('body').on('mouseenter', '.relative-date, .autoreply', function() {
        if ($(this).data('tooltipLoaded') !== true) {
          $(this).data('tooltipLoaded', true)
            .tooltip({
              placement: 'bottom',
              trigger: 'manual',
              container: 'body'
            })
            .tooltip('show');
        }
      });
      $('body').on('mouseleave', '.relative-date, .autoreply', function() {
        if ($(this).data('tooltipLoaded') === true) {
          $(this).data('tooltipLoaded', false)
            .tooltip('hide');
        }
      });

      $('body').on('click', '#message-content .message-body', function(e) {
        var elem = $(e.target).closest('.message-body');
        if (!elem.is('.selected')) {
          $('#message-content .selected').removeClass('selected');
          elem.addClass('selected');
        }
      });

      // TODO we should eliminate the need for this function as much as possible
      var angularApply = function(callback) {
        var scope = angular.element($('body')).scope();
        if (scope) {
          scope.$apply(callback);
        }
      };

      var getTernaryValue = function(positive, negative) {
        if (positive && !negative) {
          return true;
        }
        if (!positive && negative) {
          return false;
        }
      };

      $scope.setupFilters = function() {

        $('#search').on('click', function(e) {
          e.preventDefault();
          $scope.$broadcast('query');
        });
        $('#freetext').on('keypress', function(e) {
          if (e.which === 13) {
            e.preventDefault();
            $scope.$broadcast('query');
          }
        });

        var performMobileSearch = function(e) {
          e.preventDefault();
          $scope.$broadcast('query');
          $(e.target).closest('.filter').removeClass('open');
        };
        $('#mobile-search-go').on('click', performMobileSearch);
        $('#mobile-freetext').on('keypress', function(e) {
          if (e.which === 13) {
            performMobileSearch(e);
          }
        });
        $('.mobile-freetext-filter').on('shown.bs.dropdown', function() {
          $('#mobile-freetext').focus();
        });

        // stop bootstrap closing the search pane on click
        $('.filters .mobile-freetext-filter .search-pane').on('click', function(e) {
          e.stopPropagation();
        });

        // we have to wait for language to respond before initing the multidropdowns
        Language(function(err, language) {

          $translate.use(language);

          $translate('date.to').then(function () {

            $('#formTypeDropdown, #facilityDropdown, #contactTypeDropdown').each(function() {
              $(this).multiDropdown({
                label: function(state, callback) {
                  if (state.selected.length === 0 || state.selected.length === state.total.length) {
                    return callback($translate.instant(state.menu.data('label-no-filter')));
                  }
                  if (state.selected.length === 1) {
                    return callback(state.selected.first().text());
                  }
                  callback($translate.instant(
                    state.menu.data('filter-label'), { number: state.selected.length }
                  ));
                },
                selectAllLabel: $translate.instant('select all'),
                clearLabel: $translate.instant('clear')
              });
            });

            $('#statusDropdown').multiDropdown({
              label: function(state, callback) {
                var values = {};
                state.selected.each(function() {
                  var elem = $(this);
                  values[elem.data('value')] = elem.text();
                });
                var parts = [];
                if (values.valid && !values.invalid) {
                  parts.push(values.valid);
                } else if (!values.valid && values.invalid) {
                  parts.push(values.invalid);
                }
                if (values.verified && !values.unverified) {
                  parts.push(values.verified);
                } else if (!values.verified && values.unverified) {
                  parts.push(values.unverified);
                }
                if (parts.length === 0 || parts.length === state.total.length) {
                  return callback($translate.instant(state.menu.data('label-no-filter')));
                }
                return callback(parts.join(', '));
              },
              selectAllLabel: $translate.instant('select all'),
              clearLabel: $translate.instant('clear')
            });

            var start = $scope.filterModel.date.from ?
              moment($scope.filterModel.date.from) : moment().subtract(1, 'months');
            $('#date-filter').daterangepicker({
              startDate: start,
              endDate: moment($scope.filterModel.date.to),
              maxDate: moment(),
              opens: 'center',
              applyClass: 'btn-primary',
              cancelClass: 'btn-link',
              locale: {
                applyLabel: $translate.instant('Apply'),
                cancelLabel: $translate.instant('Cancel'),
                fromLabel: $translate.instant('date.from'),
                toLabel: $translate.instant('date.to'),
                daysOfWeek: moment.weekdaysMin(),
                monthNames: moment.monthsShort(),
                firstDay: moment.localeData()._week.dow
              }
            },
            function(start, end) {
              var scope = angular.element($('body')).scope();
              if (scope) {
                scope.$apply(function() {
                  scope.filterModel.date.from = start.valueOf();
                  scope.filterModel.date.to = end.valueOf();
                });
              }
            })
            .on('mm.dateSelected.daterangepicker', function(e, picker) {
              if ($('#back').is(':visible')) {
                // mobile version - only show one calendar at a time
                if (picker.container.is('.show-from')) {
                  picker.container.removeClass('show-from').addClass('show-to');
                } else {
                  picker.container.removeClass('show-to').addClass('show-from');
                  picker.hide();
                }
              }
            });
            $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');

            $('#formTypeDropdown').on('update', function() {
              var forms = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.forms = forms;
              });
            });

            $('#facilityDropdown').on('update', function() {
              var ids = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.facilities = ids;
              });
            });

            $('#contactTypeDropdown').on('update', function() {
              var ids = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.contactTypes = ids;
              });
            });

            $('#statusDropdown').on('update', function() {
              var values = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.valid = getTernaryValue(
                  _.contains(values, 'valid'),
                  _.contains(values, 'invalid')
                );
                scope.filterModel.verified = getTernaryValue(
                  _.contains(values, 'verified'),
                  _.contains(values, 'unverified')
                );
              });
            });
          });

        });
      };

      $scope.setupTour = function() {
        $('#tour-select').on('click', 'a.tour-option', function() {
          $('#tour-select').modal('hide');
        });
      };

      $scope.submitFeedback = function() {
        var pane = modal.start($('#feedback'));
        var message = $('#feedback [name=feedback]').val();
        feedback.submit(message, APP_CONFIG, function(err) {
          pane.done(translateFilter('Error saving feedback'), err);
        });
      };

      $scope.setupHeader = function() {
        Settings(function(err, settings) {
          if (err) {
            return console.log('Error retrieving settings', err);
          }
          require('../modules/add-record').init(settings.muvuku_webapp_url);
        });
      };

      UserDistrict(function() {
        $scope.$watch('filterModel', function(curr, prev) {
          if (prev !== curr) {
            $scope.$broadcast('query');
          }
        }, true);
        $scope.$broadcast('query');
      });

      CountMessages.init();

      $scope.$on('$stateChangeStart', ActiveRequests.cancel);

      $scope.reloadWindow = function() {
        $window.location.reload();
      };

      if (window.applicationCache) {
        var showUpdateReady = function() {
          $('#version-update').modal('show');
        };
        window.applicationCache.addEventListener('updateready', showUpdateReady);
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
          showUpdateReady();
        }
        Changes({ key: 'appcache', id: '_design/medic' }, function() {
          window.applicationCache.update();
        });
      }

    }
  ]);

  require('./analytics');
  require('./configuration');
  require('./configuration-export');
  require('./configuration-forms');
  require('./configuration-settings-advanced');
  require('./configuration-settings-basic');
  require('./configuration-translation-application');
  require('./configuration-translation-languages');
  require('./configuration-translation-messages');
  require('./configuration-users');
  require('./contacts');
  require('./contacts-content');
  require('./delete-language');
  require('./delete-user');
  require('./edit-contact');
  require('./edit-language');
  require('./edit-translation');
  require('./edit-user');
  require('./error');
  require('./help');
  require('./help-search');
  require('./import-contacts');
  require('./import-translation');
  require('./messages');
  require('./messages-content');
  require('./reports');
  require('./reports-content');
  require('./tasks');
  require('./theme');
  require('./tour-select');

}());
