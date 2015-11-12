/*!
 * app.js
 */
var stdio = require('stdio'),
    bodyParser = require('body-parser'),
    jade = require('jade'),
    path = require('path'),
    favicon = require('serve-favicon'),
    config = require('./config');

var ops = stdio.getopt({
    'updatedb':
        {key: 'u', args: 1, description: 'EXERCISE EXTREME CAUTION: this command will update the database', mandatory: false},
    });

var http = require('http'),
    express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.locals.moment = require('moment');

// database setup
require('./db').init(config.db);
update_db = require('./update_db');
if(ops.updatedb) {
    func = "update_db_" + ops.updatedb;
    if(typeof update_db[func] === 'function') {
        update_db[func]();
    }
}

app.use(express.static(__dirname +'/public'));
app.use('/v', express.static(__dirname +'/public'));
app.disable('etag');

// Set up routes
var routes  = require( './routes' );

app.get('/', routes.index);
app.get('/subscribe', routes.subscribe);
app.post('/submit', routes.submit);
app.post('/promptuser', routes.promptUser);
app.post('/removeallprompts', routes.removeAllPrompts);
app.get('/items', routes.items);
app.get('/v/:id', routes.viewitem);
app.post('/s/:id', routes.share);
app.post('/f/:id', routes.favorite);
app.post('/uf/:id', routes.unfavorite);
app.use(function(req, res) {
    console.log('Unable to find URI ' + req.url + ' redirecting back home');
    res.redirect('/');
});

app.set('port', config.port);

// Start server
http.createServer(app).listen(app.get('port'), function() {
    console.log('Express listening on port ' + app.get('port'));
});

exports.submit_key = config.submitkey;
exports.pushnotificationkey = config.pushnotificationkey;
