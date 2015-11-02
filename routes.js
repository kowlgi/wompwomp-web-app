var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var gcm = require('node-gcm');
var Shortid = require('shortid');
var Vibrant = require('node-vibrant');
App = require('./app');

var MAX_TEXT_LENGTH = 500;

exports.index = function(req, res, next) {
  // Show the top 20 most recent items on the home page
  AgniModel.find().sort('-created_on').limit(20).exec(function(err, items) {
    res.render(
      'showall', {
        items: items,
    });
  });
};

exports.subscribe = function(req, res, next) {
  // Get the email from the user and add it to the mailgun database
  // TODO(hnag): Add mail gun support
  res.render('emailsuccess', {
    email: req.query.email,
  });
  res.end();
  return;
}

exports.submit = function(req, res, next) {
    if(req.body.submitkey != App.submit_key) {
        console.log("wrong submit key")
        res.end();
        return;
    }

    var agniitem = new AgniModel({
        text            : req.body.text.substring(0, MAX_TEXT_LENGTH),
        imageuri        : req.body.imageuri.substring(0, MAX_TEXT_LENGTH),
        id              : Shortid.generate(),
        category        : req.body.category.slice(0, 10), // limit to 10 categories
        created_on      : Date.now(),
        numfavorites    : 0,
        numshares       : 0
    }).save(function(err, agniquote) {
        if (err) {
            console.error(err);
            return next(err);
        }

        try {
            // send another notification to notify phone app to sync feed
            sendNotification("/topics/sync", "", "");

            if(req.body.notifyuser == "content") {
                sendNotification("/topics/content", req.body.text.substring(0, MAX_TEXT_LENGTH),
                    req.body.imageuri.substring(0, MAX_TEXT_LENGTH));
            }
        } catch(err) {
            console.error(err);
        }finally {
            res.end();
        }
    });
};

function sendNotification(topicString, notificationText, imageuri) {
    var message = new gcm.Message();
    if(notificationText != "") message.addData('message', notificationText);
    if(imageuri != "") message.addData('imageuri', imageuri);

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

    var conditions = {};
    if(typeof req.query.category != "undefined"){
        conditions = {category: req.query.category};
    }

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
        console.log("share:" + item.id);
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
        console.log("favorite:" + item.id);
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
        console.log("unfavorite:" + item.id);
    });
}
