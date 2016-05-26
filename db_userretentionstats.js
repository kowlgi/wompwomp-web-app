var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.init = function(connection){
    var AgniUserRetentionStatsSchema = new Schema({
        installation_id : String,
        first_activation: Date,
        latest_activation: Date,
        all_days_activated  : [Date]
    });

    connection.model('AgniUserRetentionStats', AgniUserRetentionStatsSchema);
}
