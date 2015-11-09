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
    mongoose.connect( 'mongodb://localhost/' + agni_db_name );
};
