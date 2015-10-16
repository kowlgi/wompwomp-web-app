// IMPORTANT: Install GraphicMagick on your computer before running this tool
var stdio = require('stdio'),
    gm = require('gm'),
    fs = require('fs'),
    request = require('request'),
    stdio = require('stdio'),
    imgur = require('imgur-node-api'),
    exec = require('child_process').exec;

var ops = stdio.getopt({
    'img':
        {key: 'i', args: 1, description: 'the image you want to resize', mandatory: true},
    'width':
        {key: 'w', args: 1, description: 'the width of the resized image', mandatory: true},
    'height':
        {key: 'h', args: 1, description: 'the height of the resized image', mandatory: true},
    'api_key':
        {key: 'k', args: 1, description: 'the imgur api key', mandatory: true},
    'quote':
        {key: 'q', args: 1, description: 'enter your quote', mandatory: true},
    'category':
        {key: 'c', args: 1, description: 'enter a category', mandatory: true},
    'submitkey':
        {key: 's', args: 1, description: 'the agni submit key', mandatory: true}
    });

function upload(img) {
  imgur.setClientID(ops.api_key);
  imgur.upload(img, function (err, res) {
    console.log('Uploaded to ' + res.data.link);
    var cmd = 'curl --data "text=' + ops.quote + '&&imageuri=' + res.data.link +
              '&&category=' + ops.category + '&&submitkey=' + ops.submitkey +
              '" http://45.55.216.153:3000/submit';
    console.log(cmd);
    exec(cmd, function(error, stdout, stderr) {
      console.log(stderr);
    });
  });
};

function resize(fname, width_int, height_int, callback) {
  width = width_int.toString();
  height = height_int.toString();
  strip_extension = fname.replace(/\.[^/.]+$/, "");
  extension = fname.substr(fname.lastIndexOf('.') + 1);
  out_fname = strip_extension + '_' + width + '_' + height + '.' + extension;
  gm(fname)
    .resize('100', width, '^')
    .gravity('Center')
    .crop(width, height)
    .noProfile()
    .write(out_fname, function (err) {
      if (!err) {
        console.log('Converted ' + ops.img + ' to ' + out_fname);
      } else {
        console.log(err);
      }
    });

    gm(out_fname).size(function(err, value) {
      if (!err) {
        console.log('width = ' + value.width);
        console.log('height = ' + value.height);
        if (value.width == ops.width && value.height == ops.height) {
          console.log('Converted the file to a size requested. Now uploading to imgur ...');
          callback(out_fname);
        } else {
          process.exit(1);
        }
      }
    });
};

function fetch(callback) {
  var img = 'img';
  if (ops.img.indexOf("http://") > -1 || ops.img.indexOf("https://") > -1) {
    console.log('Fetching ' + ops.img);
    var stream = fs.createWriteStream(img);
    request(ops.img).pipe(stream);
    stream.once('close', function() {
      callback(img, ops.width, ops.height, upload);
    });
  } else {
    callback(ops.img, ops.width, ops.height, upload);
  }
};

fetch(resize);
