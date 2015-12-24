// IMPORTANT: Install GraphicMagick on your computer before running this tool
const gm = require('gm'),
    tmp = require('tmp'),
    fs = require('fs'),
    request = require('request'),
    imgur = require('imgur-node-api'),
    Config = require('./config');

function upload(fname, callback) {
    imgur.setClientID(Config.imgurkey);
    imgur.upload(fname, function (err, res) {
        if(err) {
          util.error(err);
          return callback(err);
        }

        callback(err, res.data.link);
    });
};

function pad_on(fname, extent_int, callback) {
    // Resize the image and write it out to this file
    // Get the size of the image
    var out_fname = tmp.tmpNameSync();
    gm(fname)
    .background('#FFFFFF')
    .gravity('Center')
    .extent(extent_int, extent_int)
    .resize(Config.width, Config.width, '^')
    .gravity('Center')
    .noProfile()
    .write(out_fname, function (err) {
        if (err) {
            util.error(err);
            return;
        }

        gm(out_fname).size(function(err, value) {
            if (err) {
                util.error(err);
                return callback(err);
            }

            if (value.width == Config.width && value.height == Config.height) {
                upload(out_fname, callback);
            } else {
                util.log("Error: image dimensions turned out different than expected");
                return callback(err);
            }
        });
    });
};

module.exports = function(image_path, callback) {
    gm(image_path)
    .size(function (err, size) {
        if (err) {
            util.error(err);
            return callback(err);
        }

        if (size.width <= Config.width && size.height <= Config.height) {
            pad_on(image_path, Config.width, callback);
        } else if (size.width > Config.width && size.height <= Config.height) {
            pad_on(image_path, size.width, callback);
        } else if (size.width <= Config.width && size.height > Config.height) {
            pad_on(image_path, size.height, callback);
        } else {
            pad_on(image_path, Math.max(size.width, size.height), callback);
        }
    });
}
