/*!
 * routes.js
 */

exports.index = function(req, res, next) {

};

exports.submit = function(req, res, next) {

};

exports.showall = function(req, res, next) {
    response = {"list":["You look at a problem and say \"I can use regular expressions.\" Now you have two problems.",
                        "The beginning is the end is the beginning",
                        "Make in India: Khelo India Khelo",
                        "Gamblers delusion, winner's pride"]};
    res.json(response);
};
