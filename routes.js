var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var AgniMailingListModel = mongoose.model('AgniMailingList');
var gcm = require('node-gcm');
var util = require('util');
var Mail = require('./mail');
var Shortid = require('shortid');
var Vibrant = require('node-vibrant');
var App = require('./app');

var MAX_TEXT_LENGTH = 500;
var FILTER_CONDITION = {category: {$ne: "hidden"}};
var MAX_EMAIL_LENGTH = 128;

exports.index = function(req, res, next) {
  // Show the top 20 most recent items on the home page
  AgniModel.find(FILTER_CONDITION).sort('-created_on').limit(20).exec(function(err, items) {
    res.render(
      'showall', {
        items: items,
        google_tracking_code   : App.google_tracking_code,
        app_store_link         : getAppStoreLink(req.headers['user-agent']),
        display_headline       : true,
        ctapinning             : true,
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
        util.log('/submit: received an item and submitted into db');
        try {
            // send notification to notify phone app to sync feed
            sendNotification("/topics/sync");

            if(req.body.notifyuser == "content") {
                sendNotification("/topics/content",
                    req.body.text.substring(0, MAX_TEXT_LENGTH),
                    req.body.imageuri.substring(0, MAX_TEXT_LENGTH),
                    agniquote.id);
            }
        } catch(err) {
            util.error(err);
        } finally {
            res.end();
        }
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

    var conditions = FILTER_CONDITION;
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
        find(FILTER_CONDITION).
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

function getAppStoreLink(userAgent) {
    var isAndroid = userAgent.match(/android/i);

    if(isAndroid) {
        return "market://details?id=co.wompwomp.sunshine";
    }
    else {
        return "http://play.google.com/store/apps/details?id=co.wompwomp.sunshine";
    }
}
