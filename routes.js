/*!
 * routes.js
 */

var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var gcm = require('node-gcm');
var Shortid = require('shortid');

var MAX_TEXT_LENGTH = 500;

exports.index = function(req, res, next) {
    res.end();
};

exports.submit = function(req, res, next) {
    App = require('./app');
    if(req.body.submitkey != App.submit_key) {
        res.end();
        return;
    }

    var agniitem = new AgniModel({
        text        : req.body.text.substring(0, MAX_TEXT_LENGTH),
        imageuri    : req.body.imageuri.substring(0, MAX_TEXT_LENGTH),
        id          : Shortid.generate(),
        category    : req.body.category.slice(0, 10), // limit to 10 categories
        created_on  : Date.now()
    }).save(function(err, agniquote) {
        if (err) {
            return next(err);
        }

        var message = new gcm.Message();

        message.addData('message', req.body.text.substring(0, MAX_TEXT_LENGTH));
        message.addData('imageuri', req.body.imageuri.substring(0, MAX_TEXT_LENGTH));

        // Set up the sender with you API key
        var sender = new gcm.Sender('AIzaSyDUc4BD7uJoDcMCiiiYww6Pb-eI7oeN-KI');

        // Send to a topic, with no retry this time
        sender.sendNoRetry(message, { topic: '/topics/global' }, function (err, result) {
            if(err) console.error(err);
            else    console.log(result);
        });

        res.end();
    });
};

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
        exec(function(err, quotes) {
            if(limit == 0) {
                limit = quotes.length;
            }
            if(offset == -1 ) {
                offset = quotes.length > limit ? quotes.length - limit : 0;
            }
            var quotelist = [];
            for (var i = offset; i < quotes.length && limit > 0; i++, limit--) {
                quotelist.push({"text": quotes[i].text, "imageuri": quotes[i].imageuri, "id":quotes[i].id});
            }
            var response = {list:quotelist};
            res.contentType('application/json');
            res.send(JSON.stringify(response));
        });
}
