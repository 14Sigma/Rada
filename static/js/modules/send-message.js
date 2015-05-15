var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    format = require('./format');

(function () {

  'use strict';

  var translateFn = function(key) {
    return key;
  };

  var validateMessage = function(message) {
    return {
      valid: !!message,
      message: translateFn('field is required', {
        field: translateFn('tasks.0.messages.0.message')
      }),
      value: message,
    };
  };

  var validatePhoneNumber = function(data) {
    if (data.everyoneAt) {
      return true;
    }
    var contact = data.doc.contact || data.doc;
    return contact && libphonenumber.validate(settings, contact.phone);
  };

  var validatePhoneNumbers = function(recipients) {

    // recipients is mandatory
    if (!recipients || recipients.length === 0) {
      return {
        valid: false,
        message: translateFn('field is required', {
          field: translateFn('Phone Number')
        })
      };
    }

    // all recipients must have a valid phone number
    var errors = _.filter(recipients, function(data) {
      return !validatePhoneNumber(data);
    });
    if (errors.length > 0) {
      var errorRecipients = _.map(errors, function(error) {
        return formatSelection(error);
      }).join(', ');
      return {
        valid: false,
        message: translateFn('Invalid contact numbers', {
          recipients: errorRecipients
        })
      };
    }

    return {
      valid: true,
      message: '',
      value: recipients
    };
  };

  var updateValidation = function(fn, elem, value) {
    var result = fn.call(this, value);
    elem.closest('.form-group')
        .toggleClass('has-error', !result.valid)
        .find('.help-block')
        .text(result.valid ? '' : result.message);
    return result;
  };

  var formatEveryoneAt = function(row) {
    return translateFn('Everyone at', {
      facility: row.doc.name,
      count: row.descendants && row.descendants.length
    });
  };

  var formatResult = function(row) {
    var icon,
        contact;
    if (row.everyoneAt) {
      icon = 'fa-hospital-o';
      contact = format.sender({
        name: formatEveryoneAt(row),
        parent: row.doc.parent
      });
    } else if (row.freetext) {
      icon = 'fa-user';
      contact = '<span class="freetext">' + row.id + '</span>';
    } else {
      icon = 'fa-user';
      contact = format.contact(row.doc);
    }
    return '<span class="fa fa-fw ' + icon + '"></span>' + contact;
  };

  var formatSelection = function(row) {
    if (row.everyoneAt) {
      return formatEveryoneAt(row);
    }
    return row.doc.name || row.doc.phone;
  };

  var createChoiceFromNumber = function(phone) {
    return {
      id: phone,
      freetext: true,
      doc: { phone: phone }
    };
  };

  var filter = function(options, contacts) {
    var terms = _.map(options.term.toLowerCase().split(/\s+/), function(term) {
      if (libphonenumber.validate(settings, term)) {
        return libphonenumber.format(settings, term);
      }
      return term;
    });
    var matches = _.filter(contacts, function(val) {
      var tags = [ val.doc.name, val.doc.phone ];
      var parent = val.doc.parent;
      while (parent) {
        tags.push(parent.name);
        parent = parent.parent;
      }
      tags = tags.join(' ').toLowerCase();
      return _.every(terms, function(term) {
        return tags.indexOf(term) > -1;
      });
    });
    matches.sort(function(a, b) {
      return a.doc.name.toLowerCase().localeCompare(
             b.doc.name.toLowerCase());
    });
    return matches;
  };

  var initPhoneField = function($phone) {
    if (!$phone) {
      return;
    }
    $phone.parent().show();
    $phone.select2({
      multiple: true,
      allowClear: true,
      selectFreetextOnBlur: true, // custom attribute to only select freetext on blur
      formatResult: formatResult,
      formatSelection: formatSelection,
      query: function(options) {
        contact(function(err, vals) {
          if (err) {
            return console.log('Failed to retrieve contacts', err);
          }
          options.callback({
            results: filter(options, vals)
          });
        });
      },
      createSearchChoice: function(term, data) {
        if (/^\+?\d*$/.test(term) && data.length === 0) {
          return createChoiceFromNumber(term);
        }
      }
    });
  };

  exports.showModal = function(options) {
    var $modal = $('#send-message');
    $modal.find('.has-error').removeClass('has-error');
    $modal.find('.help-block').text('');
    var val = [],
        to = options.to;
    if (to) {
      if (typeof to === 'string') {
        val.push(createChoiceFromNumber(to));
      } else if (to) {
        val.push({ id: to._id, doc: to, everyoneAt: options.everyoneAt });
      }
    }
    $modal.find('[name=phone]').select2('data', val);
    $modal.find('[name=message]').val(options.message || '');
    $modal.find('.count').text('');
    $modal.modal('show');
  };

  var contact;
  var recipients = [];
  var settings = {};

  exports.init = function(Settings, Contact, _translateFn) {
    contact = Contact;
    translateFn = _translateFn;
    Settings(function(err, _settings) {
      if (err) {
        return console.log('Failed to retrieve settings', err);
      }

      $('body').on('click', '.send-message', function(e) {
        var target = $(e.target).closest('.send-message');
        if (target.hasClass('mm-icon-disabled')) {
          return;
        }
        e.preventDefault();
        var to = target.attr('data-send-to');
        if (to) {
          try {
            to = JSON.parse(to);
          } catch(e) {}
        }
        exports.showModal({
          to: to,
          everyoneAt: target.attr('data-everyone-at') === 'true'
        });
      });
      initPhoneField($('#send-message [name=phone]'));

      settings = _settings;
    });
  };

  exports.setRecipients = function(_recipients) {
    recipients = _recipients;
  };

  var resolveRecipients = function(recipients, callback) {
    contact(function(err, contacts) {
      if (err) {
        return callback(err);
      }
      callback(null, _.map(recipients, function(recipient) {
        // see if we can resolve the facility
        var phone = recipient.doc.phone || recipient.doc.contact.phone;
        var match = _.find(contacts, function(contact) {
          return contact.doc.phone === phone &&
                 contact.everyoneAt === recipient.everyoneAt;
        });
        return match || recipient;
      }));
    });
  };

  var validateRecipients = function($modal, callback) {
    var validated = recipients;
    if ($modal.is('.modal')) {
      var $phoneField = $modal.find('[name=phone]');
      var result = updateValidation(
        validatePhoneNumbers, $phoneField, $phoneField.select2('data')
      );
      if (!result.valid) {
        return callback(result);
      }
      validated = result.value;
    }
    resolveRecipients(validated, function(err, recipients) {
      if (err) {
        return callback(err);
      }
      callback(null, {
        valid: true,
        value: recipients
      });
    });
  };

  exports.validate = function(target, callback) {

    var $modal = $(target).closest('.message-form');

    if ($modal.find('.submit [disabled]').length) {
      return;
    }

    var $messageField = $modal.find('[name=message]');

    var message = updateValidation(
      validateMessage, $messageField, $messageField.val().trim()
    );

    validateRecipients($modal, function(err, phone) {
      if (err) {
        return console.log('Error validating recipients', err);
      }
      if (phone.valid && message.valid) {
        callback(phone.value, message.value);
      }
    });

  };

}());