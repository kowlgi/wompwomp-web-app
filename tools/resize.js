// IMPORTANT: Install GraphicMagick on your computer before running this tool
var stdio = require('stdio'),
    gm = require('gm');

var ops = stdio.getopt({
    'img':
        {key: 'i', args: 1, description: 'the image you want to resize', mandatory: true},
    'width':
        {key: 'w', args: 1, description: 'the width of the resized image', mandatory: true},
    'height':
        {key: 'h', args: 1, description: 'the height of the resized image', mandatory: true},
    });

function resize(fname, width_int, height_int) {
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
      if (!err) console.log('Converted ' + ops.img + ' to ' + out_fname);
    });
};

resize(ops.img, ops.width, ops.height);
