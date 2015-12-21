var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var AgniMailingListModel = mongoose.model('AgniMailingList');
var gcm = require('node-gcm');
var util = require('util');
var Mail = require('./mail');
var Shortid = require('shortid');
var Vibrant = require('node-vibrant');
var App = require('./app');
var Moment = require('moment-timezone');
var CronParser = require('cron-parser');
var Config = require('./config');
var AgniPushNotificationStatsModel = mongoose.model('AgniPushNotificationStats');
var AgniUserStatsModel = mongoose.model('AgniUserStats');
var geoip = require('geoip-lite');
var validator = require('validator');

var MAX_TEXT_LENGTH = 500;
var NOT_HIDDEN_CATEGORY = {category: {$ne: "hidden"}};
var IS_BUFFERED_CATEGORY = {category: "buffered"};
var NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY = { $and: [{category: {$ne: "hidden"}}, {category: {$ne: "buffered"}}] };
var MAX_EMAIL_LENGTH = 128;

/* User actions */
var REFRESH_TOP = "Refresh_top";
var REFRESH_BOTTOM = "Refresh_bottom";
var LIKE = "Like";
var SHARE = "Share";
var UNLIKE = "Unlike";

exports.index = function(req, res, next) {
  AgniModel.
      find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
      sort('-created_on').limit(20).
      exec(function(err, items) {
    res.render(
      'showall', {
        items: items,
        google_tracking_code   : App.google_tracking_code,
        app_store_link         : getAppStoreLink(req.headers['user-agent']),
        display_headline       : true,
        metaDescription        : "Your funniest minute every day. Mobile friendly."
    });
  });
};

exports.subscribe = function(req, res, next) {
  if(typeof req.body.email == 'undefined'){
      util.log("missing email param for subscribe()")
      res.end();
      return;
  }

  var user_entered_email = req.body.email.substring(0, MAX_EMAIL_LENGTH);
  var one_email = new AgniMailingListModel({
    email           : user_entered_email,
    created_on      : Date.now(),
  }).save(function(err, email) {
    if (err) {
      util.error(err);
      return next(err);
    }
    util.log('Added ' + user_entered_email + ' to the db');

    // Add the user to the mailing list
    var members = [ { address: user_entered_email } ];
    // TODO(hnag): Change the mailing list to a wompwomp.co address
    App.mailgun.lists(App.MAILING_LIST).members().add({
      members: members, subscribed: true}, function (err, body) {
        util.log('Added ' + user_entered_email + ' to mailgun');
        res.end();
    });
  });
};

exports.submit = function(req, res, next) {
    if(typeof req.body.text == 'undefined' ||
       typeof req.body.imageuri == 'undefined' ||
       typeof req.body.sourceuri == 'undefined' ||
       typeof req.body.category == 'undefined'){
        util.log("missing param for submit()")
        res.end();
        return;
    }
    if(req.body.submitkey != App.submit_key) {
        util.log("wrong submit key")
        res.end();
        return;
    }

    var agniitem = new AgniModel({
        text            : req.body.text.substring(0, MAX_TEXT_LENGTH),
        imageuri        : req.body.imageuri.substring(0, MAX_TEXT_LENGTH),
        sourceuri       : req.body.sourceuri.substring(0, MAX_TEXT_LENGTH),
        id              : Shortid.generate(),
        category        : req.body.category.slice(0, 10), // limit to 10 categories
        created_on      : Date.now(),
        numfavorites    : 0,
        numshares       : 0
    }).save(function(err, agniquote) {
        if (err) {
            util.error(err);
            return next(err);
        }

        if(agniquote.category != "buffered" && agniquote.category != "hidden") {
            util.log("Pushing notification at submit time for: " + agniquote);
            // send notification to notify phone app to sync feed
            sendNotification("/topics/sync");

            if(req.body.notifyuser == "content") {
                sendNotification("/topics/content",
                    agniquote.text,
                    agniquote.imageuri,
                    agniquote.id);
            }
        }
        else {
            util.log("Either buffered or hidden submit: " + agniquote);
        }

        res.end();
    });
};

exports.pushCTA= function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        util.log("wrong submit key")
        res.end();
        return;
    }

    try {
        var date = new Date();
        if(req.body.ctatype == "share" || req.body.ctatype == "rate"){
            // send notification to add share card to feed
            sendNotification("/topics/cta_"+req.body.ctatype, date.toISOString());
        }
        else if(req.body.ctatype == "removeall") {
            sendNotification("/topics/remove_all_ctas");
        }
    } catch(err) {
        util.error(err);
    } finally {
        res.end();
    }
}

exports.removeAllPrompts = function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        util.log("wrong submit key")
        res.end();
        return;
    }

    try {
        sendNotification("/topics/remove_all_prompts");
    } catch(err) {
        util.error(err);
    } finally {
        res.end();
    }
}

function sendNotification(topicString, notificationText, imageuri, itemid) {
    var message = new gcm.Message();
    if(typeof notificationText !== 'undefined' && notificationText != "") {
        message.addData('message', notificationText);
    }

    if(typeof imageuri !== 'undefined' && imageuri != "") {
        message.addData('imageuri', imageuri);
    }

    if(typeof itemid !== 'undefined' && itemid != "") {
        message.addData("itemid", itemid);
    }

    // Set up the sender with you API key
    var sender = new gcm.Sender(App.pushnotificationkey);

    // Send to a topic, with no retry this time
    sender.sendNoRetry(message, { topic: topicString });
}

exports.items = function(req, res, next) {
    var limit = 0,  offset = 0;

    if(typeof req.query.limit != "undefined"){
        limit = parseInt(req.query.limit);
    }

    if(typeof req.query.offset != "undefined"){
        offset = parseInt(req.query.offset);
    }

    var conditions = NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY;
    //if(typeof req.query.category != "undefined"){
    //    conditions = {category: req.query.category};
    //}

    AgniModel.
        find(conditions).
        sort({_id:1}).
        exec(function(err, quotes) {
            if(limit == 0) {
                limit = quotes.length;
            }
            if(offset == -1 ) {
                offset = quotes.length > limit ? quotes.length - limit : 0;
            }
            var quotelist = [];
            for (var i = offset; i < quotes.length && limit > 0; i++, limit--) {
                quotelist.push({"text": quotes[i].text,
                                "imageuri": quotes[i].imageuri,
                                "id":quotes[i].id,
                                "created_on":quotes[i].created_on,
                                "numfavorites":quotes[i].numfavorites,
                                "numshares":quotes[i].numshares});
            }
            var response = quotelist;
            res.contentType('application/json');
            res.send(JSON.stringify(response));
        });
}

/* Here's how this works:
   cursor not specified, limit not specified: return all items
   cursor not specified, limit = x: return if (x > 0) return x number of latest items, otherwise nothing
   cursor = somedate, limit not specified: return all items created after somedate
   cursor = somedate, limit = x: if (x < 0) return x items immediately before somedate
                                 OR if (x > 0) return x items immediately after somedate
                                 OR if (x == 0) return all items immediately after somedate
*/
exports.abbreviateditems = function(req, res, next) {
    var limitval = 0,
        cursor = new Date('1995-12-17T03:24:00'), /*an arbitrary date that's
                                                    guaranteed prior to any item
                                                    creation date*/
        sortorder = -1, // descending order
        cursorInclusive = false;

    if(typeof req.query.limit != "undefined"){
        limitval = parseInt(req.query.limit);
    }

    if(typeof req.query.cursor != "undefined"){
        cursor = Date.parse(req.query.cursor) ;
        sortorder = 1; // ascending order
    }

    if(typeof req.query.cursorInclusive != "undefined" &&
       req.query.cursorInclusive == "yes") {
        cursorInclusive = true;
    }

    var find_condition = {}, sort_condition = {};

    if(limitval >= 0) {
        sort_condition = {created_on: sortorder};
        if(cursorInclusive) {
            find_condition = {created_on: {$gte: cursor}};
        }
        else {
            find_condition = {created_on: {$gt: cursor}};
        }

    } else {
        find_condition = {created_on: {$lt: cursor}};
        sort_condition = {created_on: -1};
    }

    AgniModel.
        find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
        find(find_condition).
        sort(sort_condition).
        limit(limitval).
        exec(function(err, quotes) {
            var quotelist = [];
            for (var i = 0; i < quotes.length; i++) {
                quotelist.push({"t": quotes[i].text, /* text */
                                "u": quotes[i].imageuri, /* image uri */
                                "i":quotes[i].id, /* unique id */
                                "c":quotes[i].created_on, /* created_on */
                                "f":quotes[i].numfavorites, /* num favorites */
                                "s":quotes[i].numshares}); /* num shares */
            }
            var response = quotelist;
            res.contentType('application/json');
            res.send(JSON.stringify(response));

            var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

            /* We don't want to record auto background sync
               in user stats. Assumption here is that cursorInclusive flag
               is true only in the auto background sync case.
            */
            if(!cursorInclusive) {
                var agniuserstat = new AgniUserStatsModel({
                    ip_address     : ip,
                    timestamp      : Date.now(),
                    action         : limitval < 0 ? REFRESH_BOTTOM : REFRESH_TOP,
                    content_id     : ""
                }).save();
            }
        });
}

exports.viewitem = function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item == null) {
            res.render ('404', {url:req.url});
            return;
        }

        res.render('viewitem', {
          // To simplify the rendering logic for showing one item and multiple items, we'll stick
          // the item into an array.
          items: [ item ],
          google_tracking_code   : App.google_tracking_code,
          display_home_button    : true,
          app_store_link         : getAppStoreLink(req.headers['user-agent']),
          metaDescription        : item.text
        });
    });
}

exports.share = function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item == null) {
            res.render ('404', {url:req.url});
            return;
        }

        item.numshares += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            timestamp      : Date.now(),
            action         : SHARE,
            content_id     : item.id
        }).save();
    });
}

exports.favorite = function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item == null) {
            res.render ('404', {url:req.url});
            return;
        }

        item.numfavorites += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            timestamp      : Date.now(),
            action         : LIKE,
            content_id     : item.id
        }).save();
    });
}

exports.unfavorite = function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item == null) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item.numfavorites > 0) {
            item.numfavorites -= 1;
        }

        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;

        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            timestamp      : Date.now(),
            action         : UNLIKE,
            content_id     : item.id
        }).save();
    });
}

exports.hideitem = function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        util.log("wrong submit key")
        res.end();
        return;
    }

    AgniModel.findOne({id : req.body.id}, function(err, item) {
        if(err) {
            res.render ('404', {url:req.url});
            return;
        }

        if(item == null) {
            res.render ('404', {url:req.url});
            return;
        }

        item.category[0] = "hidden";
        item.markModified('category');
        item.save();
        res.end();
    });
}

exports.install = function(req, res, next) {
    appStoreLink = getAppStoreLink(req.headers['user-agent']);
    res.redirect(appStoreLink);
}

exports.releaseBufferedContent = function() {
    util.log("releaseBufferedContent() called at " + Moment().format());
    AgniModel.
        find(IS_BUFFERED_CATEGORY).
        sort({created_on: 1}).
        limit(1).
        exec(function(err, quotes){
            if(err) {
                util.error(err);
                return;
            }

            if(quotes.length > 0) {
                quotes[0].category[0] = "";
                quotes[0].created_on = Date.now();
                quotes[0].markModified('category');
                quotes[0].markModified('created_on');
                quotes[0].save();

                util.log("Release scheduled content: " + quotes[0]);
                // send notification to notify phone app to sync feed
                sendNotification("/topics/sync");
            }
        });
}

exports.pushContentNotification = function() {
    util.log("pushContentNotification() called at " + Moment().format());
    AgniModel.
        find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
        sort({created_on: -1}).
        limit(1).
        exec(function(err, quotes){
            if(err) {
                util.error(err);
                return;
            }

            if(quotes.length > 0) {
                AgniPushNotificationStatsModel.
                    find().
                    sort({created_on: -1}).
                    limit(1).
                    exec(function(err, previousNotification) {
                        if(err) {
                            util.error(err);
                            return;
                        }

                        util.log("newest item created on: " + quotes[0].created_on);

                        if(previousNotification.length < 1 ||
                            previousNotification[0].created_on < quotes[0].created_on) {
                            util.log("Pushing scheduled notification: " + quotes[0]);

                            sendNotification("/topics/content",
                                quotes[0].text,
                                quotes[0].imageuri,
                                quotes[0].id);

                            var newPushNotification = new AgniPushNotificationStatsModel({
                                item_id    : quotes[0].id,
                                created_on : Date.now()
                            }).save(function(err, pushNotificationStat) {
                                if(err) {
                                    util.log(err);
                                    return;
                                }

                                util.log("just pushed this stat: " + pushNotificationStat);
                            });
                        }
                        else {
                            util.log("No new items for push notification");
                        }
                    });
            }
        });
}

exports.showBufferedContent = function(req, res, next) {
    var release_interval = CronParser.parseExpression(Config.release_content_scheduler_frequency);
    var notification_interval = CronParser.parseExpression(Config.push_notification_scheduler_frequency);
    var mailing_list_interval = CronParser.parseExpression(Config.mailing_list_scheduler_frequency);

    AgniModel.
        find(IS_BUFFERED_CATEGORY).
        sort({created_on: 1}).
        exec(function(err, quotes){
            if(err) {
                return next(err);
            }

            endtime = new Date('1982-12-17T03:10:10');
            for(i = 0; i < quotes.length; i++) {
                endtime = release_interval.next();
            }

            res.render('buffereditems', {
                items                           : quotes,
                starttime                       : release_interval,
                endtime                         : endtime,
                pushNotificationTime            : notification_interval,
                mailingListTime                 : mailing_list_interval,
                google_tracking_code            : App.google_tracking_code,
                app_store_link                  : getAppStoreLink(req.headers['user-agent']),
                metaDescription                 : "",
                display_buffered_item_meta_data : true
            });
        });
}

exports.userstats = function(req, res, next) {
    var lowerDateBound = new Date();
    lowerDateBound.setHours(0,0,0,0);
    var upperDateBound = new Date(lowerDateBound.getTime() + 86400000);

    if(typeof req.query.date !== 'undefined'){
        if(!validator.isDate(req.query.date)){
            res.render('userstats', {
                users: [],
                showvalidationerror: true,
                today: new Date(),
                city: 'Los Angeles'
            });
            util.log("error format");
            return;
        }
        util.log("good format");
        lowerDateBound = new Date(req.query.date);
        upperDateBound = new Date(lowerDateBound.getTime() + 86400000);
    }

    AgniUserStatsModel.
        aggregate(
            [
                {$match: {
                    timestamp : {"$gte": lowerDateBound, "$lt": upperDateBound}
                }},
                {$group: {
                    _id   : '$ip_address',
                    stats : {$push: '$$ROOT'},
                }}
            ], function(err, userlist){
            if(err) {
                util.error(err);
                return next(err);
            }

            for(i = 0; i < userlist.length; i++) {
        		var geo = geoip.lookup(userlist[i]._id) ||
                    {city: "XX", region: "XX", country: "XX"};

                if(geo.city != '') {
                    userlist[i].location = geo.city + ", ";
                }
                else {
                    userlist[i].location = '';
        		}

                if(geo.country != '') {
                    userlist[i].location += geo.country;
                }

                userlist[i].timezone = timezone_lookup(geo.country, geo.region);
            }

            res.render('userstats', {
                users: userlist,
                showvalidationerror: false,
                today: lowerDateBound,
                city: 'Los Angeles'
            });
        });
}

function getAppStoreLink(userAgent) {
    var isAndroid = userAgent.match(/android/i);

    if(isAndroid) {
        return "market://details?id=co.wompwomp.sunshine";
    }
    else {
        return "http://play.google.com/store/apps/details?id=co.wompwomp.sunshine";
    }
}

var timezone = {};
timezone.data = require('./data/tz.json');

function timezone_lookup(country, region) {
    return timezone.data[[country, region].join('_')] || timezone.data[[country, ''].join('_')];
};
