var mongoose = require('mongoose'),
  Mail = require('./mail'),
  jade = require('jade'),
  fs = require('fs'),
  util = require('util'),
  App = require('./app');
var AgniModel = mongoose.model('Agni');
var AgniMailingListModel = mongoose.model('AgniMailingList');
var AgniMailingListStatsModel = mongoose.model('AgniMailingListStats');
var MAX_CAPTION_LENGTH = 40;
// Do not email any hidden items to the user
var NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY = { $and: [{category: {$ne: "hidden"}}, {category: {$ne: "buffered"}}] };

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
  AgniMailingListStatsModel.find().sort('-created_on').limit(1).exec(function(err, stats) {
    if (stats.length == 0) {
      UpdateMailingListSendTime('test', current_time);
      util.log('mailing stats db empty; creating first entry');
    } else {
        previous_time = stats[0].created_on;
        var date_filter = { "created_on" : { $gt : new Date(previous_time) }};
        AgniModel.
            find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
            find(date_filter).
            exec(function(err, content) {
          if (content.length > 0) {
            content.sort(compare);
            content = content.slice(0,10);
            // Now prepare an email to send ...
            var meat_html = jade.renderFile('views/email.jade', {items: content});
            var html = fs.readFileSync('views/email_above.jade').toString() + meat_html + fs.readFileSync('views/email_below.jade').toString();
            var caption = content[0].text;
            if (caption.length > MAX_CAPTION_LENGTH) {
              caption = caption.substring(0, MAX_CAPTION_LENGTH) + '...';
            }
            var subject = '\'' + caption + '\' and other steaming hot posts on wompwomp.co';
            if (content.length == 1) {
              subject = 'Steaming hot post on wompwomp.co: \'' + caption + '\'';
            }
            Mail.sendHtmlEmail(App.mailgun, App.MAILING_LIST, subject, '', html, current_time, UpdateMailingListSendTime);
          } else {
            util.log('There are no new items to mail our users');
          }
        });
    }
  });
};

function compare(a,b) {
    if (a.numfavorites + a.numshares < b.numfavorites + b.numshares)
        return 1;
    if (a.numfavorites + a.numshares > b.numfavorites + b.numshares)
        return -1;
    return 0;
}
