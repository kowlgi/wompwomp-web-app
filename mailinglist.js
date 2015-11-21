var mongoose = require('mongoose'),
  Mail = require('./mail'),
  jade = require('jade'),
  fs = require('fs'),
  util = require('util'),
  App = require('./app');
var AgniModel = mongoose.model('Agni');
var AgniMailingListModel = mongoose.model('AgniMailingList');
var AgniMailingListStatsModel = mongoose.model('AgniMailingListStats');

// If there are new updates, push an email after these many seconds.
// Value of 60 is aggressive. Basically this means sending an email
// everytime the scheduler runs. To send an email once a day set this to 86400.
var LAST_SENT_SECS = 60;
var MAX_CAPTION_LENGTH = 40;

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
    util.log('Updated the mailing list time ' + timestamp);
  });
};

// If there's something new to send email the users in the mailing list
exports.GetFresh = function() {
  var previous_time = 0;
  var current_time = Date.now();
  AgniMailingListStatsModel.find().sort('-created_on').limit(1).exec(function(err, items) {
    if (items.length == 0) {
      UpdateMailingListSendTime('test', current_time);
      util.log('mailing stats db empty; creating first entry');
    } else {
      previous_time = items[0].created_on;
      var diff_secs = Math.abs(current_time - previous_time)/1000;
      util.log('Difference is ' + diff_secs);
      if (diff_secs > LAST_SENT_SECS) {
        var date_filter = { "created_on" : { $gte : new Date(previous_time) }};
        AgniModel.find(date_filter).sort('-created_on').limit(10).exec(function(err, items) {
          if (items.length > 0) {
            // Now prepare an email to send ...
            util.log('Here are the newest posts we can mail users: ' + items);
            var meat_html = jade.renderFile('views/email.jade', {items: items});
            var html = fs.readFileSync('views/email_above.jade').toString() + meat_html + fs.readFileSync('views/email_below.jade').toString();
            var caption = items[0].text;
            if (caption.length > MAX_CAPTION_LENGTH) {
              caption = caption.substring(0, MAX_CAPTION_LENGTH) + '...';
            }
            var subject = caption + ' and other steaming hot posts on WompWomp.co';
            if (items.length == 1) {
              subject = 'Steaming hot post on WompWomp.co: ' + caption;
            }
            Mail.sendHtmlEmail(App.mailgun, App.MAILING_LIST, subject, '', html, current_time, UpdateMailingListSendTime);
          } else {
            util.log('There are no new items to mail our users');
          }
        });
      }
    }
  });
};
