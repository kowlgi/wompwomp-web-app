var stdio = require('stdio'),
    bodyParser = require('body-parser'),
    jade = require('jade'),
    path = require('path'),
    favicon = require('serve-favicon'),
    schedule = require('node-schedule'),
    http = require('http'),
    express = require('express'),
    config = require('./config');

var ops = stdio.getopt({
    'updatedb':
        {key: 'u', args: 1, description: 'EXERCISE EXTREME CAUTION: this command will update the database', mandatory: false},
    'mailgun_api':
        {key: 'm', args: 1, description: 'The mailgun API key. Invalid API = no email notifications', mandatory: false},
    'email_domain':
        {key: 'e', args: 1, description: 'The deckrank email domain. Invalid domain = no email notifications', mandatory: false},
    });

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
app.post('/pushcta', routes.pushCTA);
app.get('/items', routes.items);
app.get('/v/:id', routes.viewitem);
app.post('/s/:id', routes.share);
app.post('/f/:id', routes.favorite);
app.post('/uf/:id', routes.unfavorite);
app.post('/hideitem/:id', routes.hideitem);
app.use(function(req, res) {
    console.log('Unable to find URI ' + req.url + ' redirecting back home');
    res.redirect('/');
});

app.set('port', config.port);

var mail = require('./mail');
var email_domain = "";
if (ops.mailgun_api && ops.email_domain) {
    api_key = ops.mailgun_api;
    email_domain = ops.email_domain;
};

var mailinglist = require('./mailinglist');
var rule = 1; // Run the scheduler in the first second of every minute
rule.second = mailinglist.SCHEDULER_SLEEP_SECS;
schedule.scheduleJob(rule, mailinglist.GetFresh);

// Start server
http.createServer(app).listen(app.get('port'), function() {
  console.log('Express listening on port ' + app.get('port'));
});

exports.submit_key = config.submitkey;
exports.pushnotificationkey = config.pushnotificationkey;
exports.google_tracking_code = config.google_tracking_code;
