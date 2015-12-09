var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.init = function(agni_db_name) {
    var AgniSchema = new Schema({
        text           : String,
        imageuri       : String,
        sourceuri      : String,
        id             : String,
        category       : [String],
        created_on     : Date,
        numfavorites   : Number,
        numshares      : Number
    });
    mongoose.model('Agni', AgniSchema);

    /* the database which contains the list of all users signed up for the mailing list */
    var AgniMailingListSchema = new Schema({
        email          : String,
        created_on     : Date,
    });
    mongoose.model('AgniMailingList', AgniMailingListSchema);

    /* the database which contains the date the last email blast was sent */
    var AgniMailingListStatsSchema = new Schema({
        last_sent      : String,
        created_on     : Date,
    });
    mongoose.model('AgniMailingListStats', AgniMailingListStatsSchema);

    /* the database which contains the date the last push notification was sent */
    var AgniPushNotificationStatsSchema = new Schema({
        item_id        : String,
        created_on     : Date
    });
    mongoose.model('AgniPushNotificationStats', AgniPushNotificationStatsSchema);

    mongoose.connect('mongodb://localhost/' + agni_db_name);
};
