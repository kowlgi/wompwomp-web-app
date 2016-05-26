var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.init = function(connection){
    var AgniUserStatsSchema = new Schema({
        ip_address     : String,
        installation_id: String,
        timestamp      : Date,
        action         : String,
        content_id     : String
    });

    connection.model('AgniUserStats', AgniUserStatsSchema);
};
