var mongoose = require('mongoose'),
  Mail = require('./mail'),
  App = require('./app');
var AgniModel = mongoose.model('Agni');
var AgniMailingListModel = mongoose.model('AgniMailingList');
var AgniMailingListStatsModel = mongoose.model('AgniMailingListStats');

// If there are new updates, push an email after these many seconds
var LAST_SENT_SECS = 60;

// Helper to update the last time we sent users an email
function UpdateMailingListSendTime(payload, timestamp) {
  var fist_entry = new AgniMailingListStatsModel({
    last_sent   : payload,
    created_on  : timestamp,
  }).save(function(err, first_entry) {
    if (err) {
      console.error(err);
      return next(err);
    }
    console.log('Updated the mailing list time ' + timestamp);
  });
};

// If there's something new to send email the users in the mailing list
exports.GetFresh = function() {
  var previous_time = 0;
  var current_time = Date.now();
  AgniMailingListStatsModel.find().sort('-created_on').limit(1).exec(function(err, items) {
    if (items.length == 0) {
      UpdateMailingListSendTime('test', current_time);
      console.log('mailing stats db empty; creating first entry');
    } else {
      previous_time = items[0].created_on;
      var diff_secs = Math.abs(current_time - previous_time)/1000;
      console.log('Difference is ' + diff_secs);
      if (diff_secs > LAST_SENT_SECS) {
        var date_filter = { "created_on" : { $gte : new Date(previous_time) }};
        AgniModel.find(date_filter).sort('-created_on').limit(10).exec(function(err, items) {
          if (items.length > 0) {
            // Now prepare an email to send ...
            console.log('Here are the newest items' + items);
            //
            // TODO(hnag): Write the code to generate the email. All fresh items are above
            //
            // TODO(hnag): Fix the code to send the email. The library has changed and this dumps an error
            // Mail.sendHtmlEmail(App.mailgun, App.MAILING_LIST, '', 'Whats new', '<html>Hey Now</html>', 'Okiiee');
            //
            // Update the last sent time ...
            UpdateMailingListSendTime('test', current_time);
          } else {
            console.log('There are no new items to send via email');
          }
        });
      }
    }
  });
};
