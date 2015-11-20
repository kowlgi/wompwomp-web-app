var Mongoose = require('mongoose'),
    AgniModel = Mongoose.model('Agni'),
    Shortid = require('shortid'),
    Vibrant = require('node-vibrant'),
    util = require('util'),
    Request = require('request'),
    Fs = require('fs'),
    Path = require('path');

exports.update_db_oct_16_2015 = function() {
    // Add categories and ids
    var conditions = {category : {$exists: false}, id : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            util.log(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.category = "test";
            elem.id = Shortid.generate();
            elem.save();
        });
    });
}

exports.update_db_oct_20_2015 = function() {
    // Add categories and ids to
    var conditions = {backgroundcolor : {$exists: false}, bodytextcolor : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            util.log(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            var filename = "images/" + Path.basename(elem.imageuri);
            util.log(filename);
            var stream = Fs.createWriteStream(filename);
            Request.get(elem.imageuri).pipe(stream);
            stream.once('close', function() {
                var v = new Vibrant(filename);
                v.getSwatches(function(err, swatches) {
                    if(err ||
                       typeof swatches['LightVibrant'].getHex === "undefined" ||
                       typeof swatches['LightVibrant'].getBodyTextColor === "undefined" ) {
                        util.log(err);
                        elem.backgroundcolor = "#FFFFFF";
                        elem.bodytextcolor = "#000000";
                        elem.save();
                        return;
                    }

                    var backgroundcolor = normalizeHexCode(swatches['LightVibrant'].getHex());
                    var bodytextcolor = normalizeHexCode(swatches['LightVibrant'].getBodyTextColor());

                    elem.backgroundcolor = backgroundcolor;
                    elem.bodytextcolor = bodytextcolor;
                    elem.save();
                });
            });
        });
    });
}

/* Workaround: vibrant.js return value is sometimes only #xxx (3 hex characters),
   which causes an illegal argument exception in Java Color.parseColor()
   on Android. To avoid the exception, we have to normalize the hex code
   to be 6 hex characters in length */
function normalizeHexCode(hexCode) {
    if ( hexCode.length == 4) {
        return "#" + hexCode[1] + hexCode[1] + hexCode[2] + hexCode[2] + hexCode[3] + hexCode[3];
    }
    else {
        return hexCode;
    }
}

exports.update_db_oct_24_2015 = function() {
    // Add numfavorites and numshares
    var conditions = {numfavorites : {$exists: false}, numshares : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            util.log(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.numfavorites = 0;
            elem.numshares = 0;
            elem.save();
        });
    });
}
