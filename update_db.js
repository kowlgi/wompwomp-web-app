var Mongoose = require('mongoose');
var AgniModel = Mongoose.model('Agni');
var Shortid = require('shortid');

exports.update_db_oct_16_2015 = function() {
    // Add categories and ids to
    var conditions = {category : {$exists: false}, id : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) return;
        docs.forEach(function(elem, index, array) {
            elem.category = "test";
            elem.id = Shortid.generate();
            elem.save();
        })
    });
}
