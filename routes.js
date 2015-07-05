/*!
 * routes.js
 */

var REQUEST = require('request');
var APP = require('./app');
var TELEGRAM_URL = "https://api.telegram.org/bot" +  APP.auth_token;

exports.me = function(req, res, next) {
    REQUEST(TELEGRAM_URL + "/getMe", function(err, res, body) {
        if (err) {
            return next(err);
        }
    });
};

exports.updates = function(req, res, next) {
    REQUEST(TELEGRAM_URL + "/getUpdates", function(err, res, body) {
        if (err) {
            return next(err);
        }
    });
};

exports.set_webhook = function(req, res, next) {
    console.log("/set_webhook");

};

exports.webhook = function(req, res, next) {
    console.log("/webhook");

};
