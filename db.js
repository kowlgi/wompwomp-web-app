var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

exports.init = function(agni_db_name) {
    var AgniSchema = new Schema({
        text           : String,
        imageuri       : String,
        created_on     : Date
    });
    mongoose.model('Agni', AgniSchema);
    mongoose.connect( 'mongodb://localhost/' + agni_db_name );
};
