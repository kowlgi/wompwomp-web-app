/*!
 * routes.js
 */

var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var MAX_TEXT_LENGTH = 500;

exports.index = function(req, res, next) {
    res.end();
};

exports.submit = function(req, res, next) {
    var agniitem = new AgniModel({
        text        : req.body.text.substring(0, MAX_TEXT_LENGTH),
        imageuri    : req.body.imageuri.substring(0, MAX_TEXT_LENGTH),
        created_on  : Date.now()
    }).save(function(err, agniquote) {
        if (err) {
            return next(err);
        }
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

    AgniModel.
        find().
        exec(function(err, quotes) {
            if(limit == 0) {
                limit = quotes.length;
            }
            if(offset == -1 ) {
                offset = quotes.length > limit ? quotes.length - limit : 0;
            }
            var quotelist = [];
            for (var i = offset; i < quotes.length && limit > 0; i++, limit--) {
                quotelist.push({"text": quotes[i].text, "imageuri": quotes[i].imageuri});
            }
            var response = {list:quotelist};
            res.contentType('application/json');
            res.send(JSON.stringify(response));
        });
}
