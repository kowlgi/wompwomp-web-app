const Mongoose = require('mongoose'),
      App = require('./app');
      AgniModel = App.contentdb.model('Agni');
      Shortid = require('shortid'),
      Vibrant = require('node-vibrant'),
      winstonpkg = require('winston'),
      Request = require('request'),
      Fs = require('fs'),
      Path = require('path'),
      remoteFileSize = require('remote-file-size');

var winston = new (winstonpkg.Logger)({
        transports: [
          new (winstonpkg.transports.Console)({'timestamp':true})
        ]
    });

exports.update_db_oct_16_2015 = function() {
    // Add categories and ids
    var conditions = {category : {$exists: false}, id : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
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
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            var filename = "images/" + Path.basename(elem.imageuri);
            winston.info(filename);
            var stream = Fs.createWriteStream(filename);
            Request.get(elem.imageuri).pipe(stream);
            stream.once('close', function() {
                var v = new Vibrant(filename);
                v.getSwatches(function(err, swatches) {
                    if(err ||
                       typeof swatches['LightVibrant'].getHex === "undefined" ||
                       typeof swatches['LightVibrant'].getBodyTextColor === "undefined" ) {
                        winston.info(err);
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
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.numfavorites = 0;
            elem.numshares = 0;
            elem.save();
        });
    });
}

exports.update_db_jan_5_2016 = function() {
    // Add numdismiss
    var conditions = {numdismiss : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.numdismiss = 0;
            elem.save();
        });
    });
}

exports.update_db_jan_5_2016_2 = function() {
    // Initialize sourceuri to "higgsboson" if sourceuri field doesn't exist
    var conditions = {sourceuri : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.sourceuri = "higgsboson";
            elem.markModified('sourceuri');
            elem.save();
        });
    });
}

exports.update_db_jan_5_2016_3 = function() {
    // Fix all items where sourceuri is set to a filepath starting with /
    var conditions = {sourceuri: {$exists: true}, sourceuri : {$regex: "^/"}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.sourceuri = "higgsboson";
            elem.markModified('sourceuri');
            elem.save();
        });
    });
}

exports.update_db_feb_24_2016 = function() {
    // Add numplays
    var conditions = {numplays : {$exists: false}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            elem.numplays = 0;
            elem.save();
        });
    });
}

exports.update_db_feb_29_2016 = function() {
    // Add filesize
    var conditions = {filesize : {$exists: false}, videouri: {$exists: true}};

    AgniModel.find(conditions, function(err, docs) {
        if(err) {
            winston.info(err);
            return;
        }

        docs.forEach(function(elem, index, array) {
            console.log();
            remoteFileSize(elem.videouri, function(err, sizeInBytes) {
                console.log(elem.videouri + ": " + sizeInBytes);
                elem.filesize = sizeInBytes;
                elem.save();
            });
        });
    });
}
