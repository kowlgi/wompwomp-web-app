var stdio = require('stdio'),
  imgur = require('imgur-node-api'),
  path = require('path');

var ops = stdio.getopt({
    'img':
        {key: 'i', args: 1, description: 'the image you want to upload', mandatory: true},
    'api_key':
        {key: 'k', args: 1, description: 'the imgur api key', mandatory: true},

    });

imgur.setClientID(ops.api_key);
imgur.upload(ops.img, function (err, res) {
  console.log(res.data.link); // Log the imgur url
});
