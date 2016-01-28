const mongoose = require('mongoose');
const gcm = require('node-gcm');
const Mail = require('./mail');
const Shortid = require('shortid');
const Moment = require('moment-timezone');
const CronParser = require('cron-parser');
const Config = require('./config');
const App = require('./app');
const winston = App.winston;
const AgniModel = App.contentdb.model('Agni');
const AgniMailingListModel = App.contentdb.model('AgniMailingList');
const AgniPushNotificationStatsModel = App.contentdb.model('AgniPushNotificationStats');
const AgniUserStatsModel = App.userstatsdb.model('AgniUserStats');
const geoip = require('geoip-lite');
const validator = require('validator');
const Express = require('express');
const Router = Express.Router();
const Account = App.logindb.model('Accounts');
const multer  = require('multer');
const upload = multer(
    {
        dest: 'uploads/',
        limits: {
            fileSize: 204800 /* 200 KB filesize limit */
        },
        fileFilter: function(req, file, cb) {
            var type = file.mimetype;
            if (type !== 'image/png' && type !== 'image/jpg' && type !== 'image/jpeg') {
              cb(new Error("Uploaded file type must either png or jpg"));
            } else {
              cb(null, true);
            }
        }
    }
).single('imagefile');
const modifyAndUploadImage = require('./modify-and-upload-image');
const _ = require('lodash');

const MAX_TEXT_LENGTH = 500;
const IS_BUFFERED_CATEGORY = {category: "buffered"};
const IS_IN_REVIEW_CATEGORY = {category: "in_review"};
const IS_NOT_HIDDEN = {category: {$ne: "hidden"}};
const NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY = { $and:
    [{category: {$ne: "hidden"}},
    {category: {$ne: "buffered"}},
    {category: {$ne: "in_review"}}] };
const NO_VIDEOS = {$or: [{videouri: {$exists: false}}, {videouri: ""}]};
const MAX_EMAIL_LENGTH = 128;

/* User actions */
const REFRESH_TOP = "Refresh_top";
const REFRESH_BOTTOM = "Refresh_bottom";
const LIKE = "Like";
const SHARE = "Share";
const UNLIKE = "Unlike";
const DISMISS = "Dismiss";
const PLAY_VIDEO = "Play_video"

Router.get('/', function(req, res, next) {
  AgniModel.
      find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
      sort('-created_on').limit(20).
      exec(function(err, items) {
    res.render(
      'showall', {
        items: items,
        display_headline       : true,
        metaDescription        : "Your funniest minute every day. Mobile friendly."
    });
  });
});

Router.post('/subscribe', function(req, res, next) {
  if(typeof req.body.email == 'undefined'){
      winston.info("missing email param for subscribe()")
      res.end();
      return;
  }

  var user_entered_email = req.body.email.substring(0, MAX_EMAIL_LENGTH);
  var one_email = new AgniMailingListModel({
    email           : user_entered_email,
    created_on      : Date.now(),
  }).save(function(err, email) {
    if (err) {
      winston.error(err);
      return next(err);
    }
    winston.info('Added ' + user_entered_email + ' to the db');

    // Add the user to the mailing list
    var members = [ { address: user_entered_email } ];
    // TODO(hnag): Change the mailing list to a wompwomp.co address
    App.mailgun.lists(App.MAILING_LIST).members().add({
      members: members, subscribed: true}, function (err, body) {
        winston.info('Added ' + user_entered_email + ' to mailgun');
        res.end();
    });
  });
});

Router.post('/submit', function(req, res, next) {
    if(typeof req.body.text == 'undefined' ||
       typeof req.body.imageuri == 'undefined' ||
       typeof req.body.sourceuri == 'undefined' ||
       typeof req.body.category == 'undefined'){
        winston.info("missing param for submit()")
        res.end();
        return;
    }
    if(req.body.submitkey != App.submit_key) {
        winston.info("wrong submit key")
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
            winston.error(err);
            return next(err);
        }

        if(agniquote.category != "buffered" && agniquote.category != "hidden") {
            winston.info("Pushing notification at submit time for: " + agniquote);
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
            winston.info("Either buffered or hidden submit: " + agniquote);
        }

        res.end();
    });
});

Router.post('/pushcta', function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        winston.info("wrong submit key")
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
        winston.error(err);
    } finally {
        res.end();
    }
});

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

Router.get('/items', function(req, res, next) {
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
});

/* Here's how this works:
   cursor not specified, limit not specified: return all items
   cursor not specified, limit = x: return if (x > 0) return x number of latest items, otherwise nothing
   cursor = somedate, limit not specified: return all items created after somedate
   cursor = somedate, limit = x: if (x < 0) return x items immediately before somedate
                                 OR if (x > 0) return x items immediately after somedate
                                 OR if (x == 0) return all items immediately after somedate
   This API will be deprecated starting apk v1.2, the first release with video support
*/
Router.get('/i', function(req, res, next) {
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
        find(NO_VIDEOS).
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
                                "s":quotes[i].numshares, /* num shares */
                                "a":quotes[i].sourceuri /* author's name */
                               });
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
});

/* Here's how this works:
   cursor not specified, limit not specified: return all items
   cursor not specified, limit = x: return if (x > 0) return x number of latest items, otherwise nothing
   cursor = somedate, limit not specified: return all items created after somedate
   cursor = somedate, limit = x: if (x < 0) return x items immediately before somedate
                                 OR if (x > 0) return x items immediately after somedate
                                 OR if (x == 0) return all items immediately after somedate
*/
Router.get('/iv', function(req, res, next) {
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
                                "s":quotes[i].numshares, /* num shares */
                                "a":quotes[i].sourceuri, /* author's name */
                                "m":quotes[i].videouri || "",/* video uri is populated only for videos */
                                "p":quotes[i].numplays /* number of times the video was played */
                               });
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
});

Router.get('/v/:id', function(req, res, next) {
    AgniModel.
        find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
        exec(function(err, items) {
            if(err) {
                winston.error(err);
                return next(err);
            }

            items.sort(compareUserInteractions);

            const now = new Date();
            const liveAWeekAgo = _.filter(items, function(item) {
                return days_between(item.created_on, now) <= 7 &&
                    item.id != req.params.id;
            });

            var i = 0;
            for(i = 0; i < items.length; i++) {
                if(items[i].id == req.params.id) {
                    break;
                }
            }

            var item;
            if(i == items.length) {
                return res.render ('404', {url:req.url});
            }
            else {
                item = items[i];
            }

            return res.render('viewitem', {
              // To simplify the rendering logic for showing one item and multiple items, we'll stick
              // the item into an array.
              item                   : item,
              display_home_button    : true,
              topItems               : liveAWeekAgo.slice(0,5)
            });
        });
});

Router.post('/s/:id', function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        item.numshares += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var inst_id = req.body.inst_id || "no installation id"
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            installation_id: inst_id,
            timestamp      : Date.now(),
            action         : SHARE,
            content_id     : item.id
        }).save();
    });
});

Router.post('/p/:id', function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        item.numplays += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var inst_id = req.body.inst_id || "no installation id"
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            installation_id: inst_id,
            timestamp      : Date.now(),
            action         : PLAY_VIDEO,
            content_id     : item.id
        }).save();
    });
});

Router.post('/f/:id', function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        item.numfavorites += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var inst_id = req.body.inst_id || "no installation id"
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            installation_id: inst_id,
            timestamp      : Date.now(),
            action         : LIKE,
            content_id     : item.id
        }).save();
    });
});

Router.post('/uf/:id', function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        if(item.numfavorites > 0) {
            item.numfavorites -= 1;
        }

        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var inst_id = req.body.inst_id || "no installation id"
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            installation_id: inst_id,
            timestamp      : Date.now(),
            action         : UNLIKE,
            content_id     : item.id
        }).save();
    });
});

Router.post('/hideitem', function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        winston.info("wrong submit key")
        res.end();
        return;
    }

    AgniModel.findOne({id : req.body.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        item.category[0] = "hidden";
        item.markModified('category');
        item.save();
        res.end();
    });
});

Router.post('/d/:id', function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        item.numdismiss += 1;
        item.save();
        res.end();

        var ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
        var inst_id = req.body.inst_id || "no installation id"
        var agniuserstat = new AgniUserStatsModel({
            ip_address     : ip,
            installation_id: inst_id,
            timestamp      : Date.now(),
            action         : DISMISS,
            content_id     : item.id
        }).save();
    });
});

Router.get('/install', function(req, res, next) {
    const userAgent = req.headers['user-agent'];
    const isAndroid = userAgent.match(/android/i);

    if(isAndroid) {
        return res.redirect("http://play.google.com/store/apps/details?id=co.wompwomp.sunshine");
    }
    else {
        return res.redirect("/subscribe");
    }
});

Router.get('/subscribe', function(req, res, next) {
    const userAgent = req.headers['user-agent'];
    const isAndroid = userAgent.match(/android/i);
    const appStoreLink = "http://play.google.com/store/apps/details?id=co.wompwomp.sunshine";

    if(!isAndroid) {
        req.flash('info', "We don't have an app yet for your device. You can enjoy wompwomp by getting on our mailing list. Subscribe below");
    }
    return res.render('subscribe', {app_store_link : appStoreLink, disable_install_cta: true});
});

Router.get('/buffer', App.user.can('access admin page'), function(req, res, next) {
    var release_interval = CronParser.parseExpression(Config.release_content_scheduler_frequency);
    var notification_interval = CronParser.parseExpression(Config.push_notification_scheduler_frequency);
    var mailing_list_interval = CronParser.parseExpression(App.mailing_list_scheduler_frequency);
    var push_share_card_interval = CronParser.parseExpression(Config.push_share_card_scheduler_frequency);
    var push_rate_card_interval = CronParser.parseExpression(Config.push_rate_card_scheduler_frequency);

    AgniModel.
        find(IS_BUFFERED_CATEGORY).
        sort({created_on: 1}).
        exec(function(err, quotes){
            if(err) {
                winston.error(err);
                return next(err);
            }

            endtime = new Date('1982-12-17T03:10:10');
            for(i = 0; i < quotes.length; i++) {
                endtime = release_interval.next();
            }

            res.render('private/buffereditems', {
                items                           : quotes,
                starttime                       : release_interval,
                endtime                         : endtime,
                pushNotificationTime            : notification_interval,
                mailingListTime                 : mailing_list_interval,
                display_buffered_item_meta_data : true,
                user                            : req.user,
                pushRateCardTime                : push_rate_card_interval,
                pushShareCardTime               : push_share_card_interval
            });
        });
});

Router.get('/dailystats', App.user.can('access admin page'), function(req, res, next) {
    var lowerDateBound = new Date();
    lowerDateBound.setHours(0,0,0,0);
    var upperDateBound = new Date(lowerDateBound.getTime() + 86400000);

    if(typeof req.query.date !== 'undefined' && validator.isDate(req.query.date)){
        lowerDateBound = new Date(req.query.date);
        upperDateBound = new Date(lowerDateBound.getTime() + 86400000);
    }

    AgniUserStatsModel.
        aggregate(
            [
                {$match: {
                    timestamp : {"$gte": lowerDateBound, "$lt": upperDateBound}
                    }
                },
                {$group: {
                        _id             : '$ip_address',
                        installation_id : {$push: '$installation_id'},
                        stats           : {$push: '$$ROOT'},
                    }
                }
            ], function(err, userlist){
            if(err) {
                winston.error(err);
                return next(err);
            }

            var likedAndSharedItems = [];
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

                userlist[i].timezone = timezone_lookup(geo.country, geo.region) ||
                    'America/New_York';

                likedAndSharedItems = likedAndSharedItems.concat(
                    _.filter(userlist[i].stats, function(item) {
                        return item.action === LIKE || item.action === SHARE;
                    })
                );
            }

            var userInteractions = {};
            for(i = 0; i < likedAndSharedItems.length; i++) {
                var item = likedAndSharedItems[i];
                if(item.content_id in userInteractions) {
                    if(item.action === SHARE){
                        userInteractions[item.content_id].numshares++;
                    }
                    else if (item.action === LIKE) {
                        userInteractions[item.content_id].numfavorites++;
                    }
                }
                else {
                    userInteractions[item.content_id] = {numshares:0, numfavorites: 0, id: item.content_id};
                    if(item.action === SHARE) {
                        userInteractions[item.content_id].numshares++;
                    }
                    else if(item.action === LIKE) {
                        userInteractions[item.content_id].numfavorites++;
                    }
                }
            }

            var topItems = [];
            for (var key in userInteractions) topItems.push([key, userInteractions[key]]);
            topItems.sort(function(a, b) {
                a = a[1];
                b = b[1];

                if (a.numfavorites + a.numshares < b.numfavorites + b.numshares)
                    return 1;
                if (a.numfavorites + a.numshares > b.numfavorites + b.numshares)
                    return -1;
                return 0;
            });

            //userInteractions.sort(compareUserInteractions);
            //util.log(userInteractions.length);
            res.render('private/dailystats', {
                users: userlist,
                today: lowerDateBound,
                user: req.user,
                topItems: topItems
            });
        });
});

Router.get('/userstats', App.user.can('access admin page'), function(req, res, next) {
    var user_ip = " ";
    if(typeof req.query.ip !== 'undefined') {
        user_ip = req.query.ip;
    }

    AgniUserStatsModel.
        aggregate(
            [
                {$match: {
                    ip_address : user_ip
                    }
                },
                {$group: {
                    _id : {
                        year : {$year       : "$timestamp"},
                        month: {$month      : "$timestamp"},
                        day  : {$dayOfMonth : "$timestamp"},
                    },
                    events : {$push: '$$ROOT'},
                    }
                }
            ], function(err, datelist){
            if(err) {
                winston.error(err);
                return next(err);
            }

            var geo = geoip.lookup(user_ip) ||
                {city: "XX", region: "XX", country: "XX"};

            if(geo.city != '') {
                user_location = geo.city + ", ";
            }
            else {
                user_location = '';
            }

            if(geo.country != '') {
                user_location += geo.country;
            }

            user_timezone = timezone_lookup(geo.country, geo.region) ||
                'America/New_York';

            res.render('private/userstats', {
                days: datelist,
                location: user_location,
                timezone: user_timezone,
                ip_address: user_ip,
                user: req.user
            });
        });
});

Router.get('/itemstats', App.user.can('access private page'), function(req, res, next) {
  AgniModel.
      find().
      exec(function(err, items) {
          if(err) {
              winston.error(err);
              return next(err);
          }
          items.sort(compareUserInteractions);
          const popularItems = _.filter(items, function(item) {
              return item.numshares + item.numfavorites > 0;
          });

          const liveItems = _.filter(popularItems, function(item) {
              return item.category.indexOf("hidden") == -1 &&
                  item.category.indexOf("in_review") == -1 &&
                  item.category.indexOf("buffered") == -1;
          });

          const now = new Date();
          const liveAWeekAgo = _.filter(popularItems, function(item) {
              return days_between(item.created_on, now) <= 7;
          });

          const liveADayAgo = _.filter(liveAWeekAgo, function(item) {
              return days_between(item.created_on, now) <= 1;
          });

          res.render('private/itemstats', {
              totalCount : items.length,
              hiddenCount: _.filter(items, function(item) {
                  return item.category.indexOf("hidden") != -1;
              }).length,
              reviewCount: _.filter(items, function(item) {
                  return item.category.indexOf("in_review") != -1;
              }).length,
              bufferedCount: _.filter(items, function(item) {
                  return item.category.indexOf("buffered") != -1;
              }).length,
              liveCount: liveItems.length,
              allTimePopular: liveItems.slice(0,10),
              last24HrsPopular: liveADayAgo.slice(0,10),
              lastWeekPopular: liveAWeekAgo.slice(0,10)
          });
  });
});

/* http://stackoverflow.com/questions/2627473/how-to-calculate-the-number-of-days-between-two-dates-using-javascript */
function days_between(date1, date2) {
    // The number of milliseconds in one day
    const ONE_DAY = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    const date1_ms = date1.getTime();
    const date2_ms = date2.getTime();

    // Calculate the difference in milliseconds
    const difference_ms = Math.abs(date1_ms - date2_ms);

    // Convert back to days and return
    return Math.ceil(difference_ms/ONE_DAY);

}

Router.get('/post', App.user.can('access private page'), function(req, res, next) {
    res.render('private/post', {user: req.user, videofilename: Shortid.generate()});
});

Router.post('/post', App.user.can('access private page'), function(req, res, next) {
    upload(req, res, function (err) {
        if(err) {
            req.flash('error', err.message);
            return res.render('private/post');
        }

        modifyAndUploadImage(req.file.path, function(err, imageurl) {
            if(err) {
                req.flash('error', err.message);
                return res.render('private/post');
            }

            var agniitem = new AgniModel({
                text            : req.body.caption.substring(0, MAX_TEXT_LENGTH),
                imageuri        : imageurl,
                sourceuri       : req.user.username,
                id              : Shortid.generate(),
                category        : ['in_review'],
                numfavorites    : 0,
                numshares       : 0
            }).save(function(err, agniquote) {
                if (err) {
                    winston.error(err);
                    req.flash('error', err.message)
                    return res.render('private/post');
                }

                req.flash('success', "Thanks for submitting! Your post is currently in the review bin and will go live once an admin has approved it");
                res.render('private/post');
            });
        });
    });
});

Router.post('/postvideo', App.user.can('access private page'), function(req, res, next) {
    var agniitem = new AgniModel({
        text            : req.body.caption.substring(0, MAX_TEXT_LENGTH),
        imageuri        : Config.AWSS3BucketVideoURL + req.body.id + ".jpg",
        videouri        : Config.AWSS3BucketVideoURL + req.body.id + ".mp4",
        sourceuri       : req.user.username,
        id              : Shortid.generate(),
        category        : ['in_review'],
        numfavorites    : 0,
        numshares       : 0
    }).save(function(err, agniquote) {
        if (err) {
            winston.error(err);
            req.flash('error', err.message)
            return res.render('private/post');
        }

        req.flash('success', "Thanks for submitting! Your post is currently in the review bin and will go live once an admin has approved it");
        res.render('private/post');
    });
});

Router.get('/review', App.user.can('access admin page'), function(req, res, next) {
    AgniModel.
        find(IS_IN_REVIEW_CATEGORY).
        sort({created_on: 1}).
        exec(function(err, inReviewItems){
            if(err) {
                winston.error(err);
                return next(err);
            }
            res.render('private/reviewitems',
                {
                    items: inReviewItems,
                    enable_show_item: true,
                    allow_edit: true
                }
            );
        });
});

Router.post('/review/:id', App.user.can('access admin page'), function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return next(err);
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        if(req.body.reviewdecision == "hide") {
            item.category[0] = "hidden";
        }
        else if(req.body.reviewdecision == "show") {
            item.category[0] = "buffered";
        }
        else if(req.body.reviewdecision == "review") {
            item.category[0] = "in_review";
        }
        else {
            req.flash("Only valid values are: hide, show and review");
        }

        item.markModified('category');
        item.save();
        res.end();
    });
});

Router.get('/dashboard', function(req, res, next) {
    if (!req.isAuthenticated())
        return res.render('private/dashboard', {user: req.user});

    AgniModel.
        find({sourceuri: req.user.username}).
        sort('-created_on').
        exec(function(err, items) {
            var reviewitems = [], goingliveitems = [], liveitems = [];
            for(i = 0; i < items.length; i++) {
                if(items[i].category[0] == "in_review") {
                    reviewitems.push(items[i]);
                }
                else if(items[i].category[0] == "buffered") {
                    goingliveitems.push(items[i]);
                }
                else if(items[i].category[0] == "hidden") {
                    // do nothing
                }
                else {
                    // must be live if it's no other category
                    liveitems.push(items[i]);
                }
            }

            return res.render(
                'private/dashboard',
                {
                  user: req.user,
                  reviewitems: reviewitems,
                  goingliveitems: goingliveitems,
                  liveitems: liveitems
                }
            );
    });
});

Router.get('/edititem/:id', App.user.can('access private page'), function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        if(item.category[0] != "in_review" &&
           item.category[0] != "hidden") {
               if(item.category[0] == "buffered") {
                   req.flash("error", "This post cannot be edited as it's going live.");
               }
               else {
                   req.flash("error", "This post cannot be edited as it's already live.");
               }
               return res.render('private/edititem',
                    {
                        user: req.user,
                        allow_edit: false,
                        item: item
                    }
                );
        }

        return res.render('private/edititem',
        {
            user: req.user,
            allow_edit: true,
            item: item
        });
    });
});

Router.post('/edititem/:id', App.user.can('access private page'), function(req, res, next) {
    AgniModel.findOne({id : req.params.id}, function(err, item) {
        if(err) {
            return res.render ('404', {url:req.url});
        }

        if(item == null) {
            return res.render ('404', {url:req.url});
        }

        if(item.category[0] != "in_review" &&
           item.category[0] != "buffered" &&
           item.category[0] != "hidden") {
               req.flash("error", "This post cannot be edited as it's already live.");
               return res.render('private/edititem',
                    {
                        user: req.user,
                        allow_edit: false,
                        item: item
                    }
                );
        }

        winston.info(req.body.caption);
        item.text = req.body.caption.substring(0, MAX_TEXT_LENGTH);
        item.markModified('text');
        item.save();

        return res.end();
    });
});

Router.get('/signin', isNotLoggedIn, function(req, res, next) {
    res.render('private/signin', {user: req.user});
});

Router.post('/signin',
    isNotLoggedIn,
    passport.authenticate('local',
        {
            failureRedirect: '/signin',
            failureFlash: true
        }
    ),
    function(req, res, next) {
        req.session.save(function (err) {
            if (err) {
                winston.error(err);
                req.flash('error', err.message);
                return res.render("private/signin");
            }
            res.redirect('/dashboard');
        });
    });

Router.get('/signout', isLoggedIn, function(req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            winston.error(err);
            return next(err);
        }
        res.redirect('/dashboard');
    });
});

Router.get('/signup', isNotLoggedIn, function(req, res, next) {
    res.render('private/signup');
});

Router.post('/signup', function(req, res, next) {
    if( /[^a-zA-Z0-9]/.test(req.body.username) ) {
        req.flash('error', "Username must only contain alphanumeric characters");
        return res.render('private/signup',
            {
                username: req.body.username,
                email: req.body.email
            }
        );
    }

    Account.findOne({username: req.body.username.toLowerCase()}, function(err, item) {
        if(err) {
            winston.error(err);
            return next(err);
        }

        if(item != null) {
            req.flash('error', "A user with the given username is already registered");
            return res.render('private/signup',
                {
                    username: req.body.username,
                    email: req.body.email
                }
            );
        }

        if(req.body.username.length < 4) {
            req.flash('error', "Username must be at least 4 characters long");
            return res.render('private/signup',
                {
                    username: req.body.username,
                    email: req.body.email
                }
            );
        }

        Account.register(
                new Account({
                            username : req.body.username,
                            email: req.body.email,
                            role : "contributor" }),
                req.body.password,
                function(err, account) {
            if (err) {
                winston.error(err);
                req.flash('error', err.message);
                return res.render("private/signup",
                    {
                        username: req.body.username,
                        email: req.body.email
                    }
                );
            }

            passport.authenticate('local',
                {
                    failureRedirect: '/signup',
                    failureFlash: true,
                    successFlash: 'Welcome!'
                })(req, res, function () {
                req.session.save(function (err) {
                    if (err) {
                        winston.error(err);
                        req.flash('error', err.message);
                        return res.render("private/signup",
                            {
                                username: req.body.username,
                                email: req.body.email
                            }
                        );
                    }
                    res.redirect('/dashboard');
                });
            });
        });
    });
});

exports.releaseBufferedContent = function() {
    winston.info("releaseBufferedContent()");
    AgniModel.
        find(IS_BUFFERED_CATEGORY).
        sort({created_on: 1}).
        limit(1).
        exec(function(err, quotes){
            if(err) {
                winston.error(err);
                return;
            }

            if(quotes.length > 0) {
                quotes[0].category[0] = "";
                quotes[0].created_on = Date.now();
                quotes[0].markModified('category');
                quotes[0].markModified('created_on');
                quotes[0].save();
                // send notification to notify phone app to sync feed
                sendNotification("/topics/sync");
            }
        });
}

exports.pushContentNotification = function() {
    winston.info("pushContentNotification()");
    AgniModel.
        find(NEITHER_HIDDEN_NOR_BUFFERED_CATEGORY).
        sort({created_on: -1}).
        limit(1).
        exec(function(err, quotes){
            if(err) {
                winston.error(err);
                return;
            }

            if(quotes.length > 0) {
                AgniPushNotificationStatsModel.
                    find().
                    sort({created_on: -1}).
                    limit(1).
                    exec(function(err, previousNotification) {
                        if(err) {
                            winston.error(err);
                            return;
                        }

                        winston.info("newest item created on: " + quotes[0].created_on);

                        if(previousNotification.length < 1 ||
                            previousNotification[0].created_on < quotes[0].created_on) {
                            winston.info("Pushing scheduled notification: " + quotes[0]);

                            sendNotification("/topics/content",
                                quotes[0].text,
                                quotes[0].imageuri,
                                quotes[0].id);

                            var newPushNotification = new AgniPushNotificationStatsModel({
                                item_id    : quotes[0].id,
                                created_on : Date.now()
                            }).save(function(err, pushNotificationStat) {
                                if(err) {
                                    winston.info(err);
                                    return;
                                }

                                winston.info("just pushed this stat: " + pushNotificationStat);
                            });
                        }
                        else {
                            winston.info("No new items for push notification");
                        }
                    });
            }
        });
}

exports.pushShareCard = function() {
    var date = new Date();
    sendNotification("/topics/remove_all_ctas");
    sendNotification("/topics/cta_share", date.toISOString());
}

exports.pushRateCard = function() {
    var date = new Date();
    sendNotification("/topics/remove_all_ctas");
    sendNotification("/topics/cta_rate", date.toISOString());
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the signin page
    res.redirect('/signin');
}

// route middleware to make sure a user isn't logged in
function isNotLoggedIn(req, res, next) {

    // if user is not authenticated in the session, carry on
    if (!req.isAuthenticated())
        return next();

    // if they aren't redirect them to the dashboard
    res.redirect('/dashboard');
}

const timezone = {};
timezone.data = require('./data/tz.json');

function timezone_lookup(country, region) {
    return timezone.data[[country, region].join('_')] || timezone.data[[country, ''].join('_')];
}

function compareUserInteractions(a,b) {
    if (a.numfavorites + a.numshares < b.numfavorites + b.numshares)
        return 1;
    if (a.numfavorites + a.numshares > b.numfavorites + b.numshares)
        return -1;
    return 0;
}

exports.router = Router;
