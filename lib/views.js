exports.facilities = {
  map: function (doc) {
    if (doc.type === 'clinic' ||
        doc.type === 'health_center' ||
        doc.type === 'district_hospital' ||
        doc.type === 'national_office' ||
        doc.type === 'person') {

      var phone = doc.phone || doc.contact && doc.contact.phone,
          rc_code = doc.contact && doc.contact.rc_code;
      emit(
        [doc.type],
        {
          name: doc.name,
          contact: doc.contact,
          rc_code: rc_code,
          phone: phone
        }
      );
    }
  }
};

exports.facilities_by_district = {
  map: function (doc) {
    var dh_id,
        contact = doc.contact;
    if (doc.type === 'person' && doc.parent && doc.parent.parent && doc.parent.parent.parent) {
      dh_id = doc.parent.parent.parent._id;
      contact = doc;
    } else if (doc.type === 'clinic' && doc.parent && doc.parent.parent) {
      dh_id = doc.parent.parent._id;
    } else if (doc.type === 'health_center' && doc.parent) {
      dh_id = doc.parent._id;
    } else if (doc.type === 'district_hospital') {
      dh_id = doc._id;
    }
    if (dh_id) {
      emit(
        [dh_id, doc.type],
        {
          name: doc.name,
          rc_code: contact && contact.rc_code,
          phone: contact && contact.phone
        }
      );
    }
  }
};

exports.facilities_by_contact = {
  map: function (doc) {
    if ((doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') &&
        doc.contact &&
        doc.contact._id) {
      emit([doc.contact._id], 1);
    }
  }
};

exports.reminders = {
  map: function(doc) {

    var getDistrictId = function(facility) {
      while (facility && facility.type !== 'district_hospital') {
        facility = facility.parent;
      }
      return facility && facility._id;
    };

    var phone,
        refid,
        tasks,
        dh_id = getDistrictId(doc.contact);

    if (doc.type === 'data_record' && doc.form && doc.week_number && doc.year) {
      phone = doc.contact && doc.contact.phone;
      refid = doc.contact && doc.contact.parent && doc.contact.parent.rc_code;
      if (phone || (refid && refid !== null)) {
        emit([dh_id, doc.year, doc.week_number, phone, refid], 'report received');
      }
    } else if (doc.type === 'weekly_reminder' && doc.related_form && doc.week && doc.year && doc.phone) {
      tasks = doc.tasks;
      state = tasks.length ? tasks[0].state : 'unknown';
      emit([dh_id, doc.year, doc.week, doc.phone, doc.refid], 'reminder ' + state);
    }
  },
  reduce: function(keys, values) {
    return values.reduce(function(memo, value) {
      if (memo === 'report received') {
        return memo;
      } else if (memo === 'reminder sent') {
        return memo;
      } else {
        return value;
      }
    }, 'unknown');
  }
}

exports.delivery_reports_by_district_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        doc.errors.length === 0 &&
        doc.delivery_code) {
      var getDistrictId = function(facility) {
        while (facility && facility.type !== 'district_hospital') {
          facility = facility.parent;
        }
        return facility && facility._id;
      };
      var dh = getDistrictId(doc.contact),
          code = doc.delivery_code.toUpperCase();
      emit([dh, code], 1);
      emit(['_admin', code], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.delivery_reports_by_year_month_and_code = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'D' &&
        doc.errors.length === 0 &&
        doc.delivery_code) {
      var date = new Date(doc.reported_date);
      emit([date.getFullYear(), date.getMonth(), doc.delivery_code.toUpperCase()], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.data_records_by_year_month_and_facility = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.errors.length === 0 &&
        doc.contact &&
        doc.contact.parent) {
      var date = new Date(doc.reported_date);
      emit([date.getFullYear(), date.getMonth(), doc.contact.parent._id], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.visits_by_district_and_patient = {
  map: function(doc) {
    if (doc.type === 'data_record' &&
        doc.form === 'V' &&
        doc.errors.length === 0) {

      var getDistrictId = function(facility) {
        while (facility && facility.type !== 'district_hospital') {
          facility = facility.parent;
        }
        return facility && facility._id;
      };

      var dh = getDistrictId(doc.contact);
      emit([dh, doc.patient_id], 1);
      emit(['_admin', doc.patient_id], 1);
    }
  },
  reduce: function(key, counts) {
    return sum(counts);
  }
};

exports.feedback = {
  map: function(doc) {
    if (doc.type === 'feedback') {
      emit([new Date(doc.meta.time).valueOf()], 1);
    }
  }
};

exports.meta = {
  map: function(doc) {
    if (doc.type === 'meta') {
      emit(['meta'], 1);
    }
  }
};