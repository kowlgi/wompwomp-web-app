var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

exports.init = function(connection){
    var Account = new Schema({
        username: String,
        email: String,
        role: String
    });

    Account.plugin(
        passportLocalMongoose,
        {
            limitAttempts: true,
            maxAttempts: 5
    });

    connection.model('Accounts', Account);
};
