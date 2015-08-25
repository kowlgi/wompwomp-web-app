/*!
 * routes.js
 */

var mongoose = require('mongoose');
var AgniModel = mongoose.model('Agni');
var MAX_QUOTE_LENGTH = 140;

exports.index = function(req, res, next) {
    res.end();
};

exports.submit = function(req, res, next) {
    var agniquote = new AgniModel({
        quote        : req.body.quote.substring(0, MAX_QUOTE_LENGTH),
        created_on   : Date.now()
    }).save(function(err, agniquote) {
        if (err) {
            return next(err);
        }
        res.end();
    });
};

exports.showall = function(req, res, next) {
    AgniModel.
        find().
        exec(function(err, quotes) {
            var quotelist = [];
            for (var i = 0; i < quotes.length; i++) {
                quotelist.push(quotes[i].quote);
            }
            var response = {list:quotelist};
            res.contentType('application/json');
            res.send(JSON.stringify(response));
        });
};
