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
    // TODO(hnag): Fix this to be a wompwomp address once mailgun verifies
    'mailing_list':
        {key: 'l', args: 1, description: 'Who to send the mail to', default: 'wompwomp@mg.deckrank.co', mandatory: false},
    'scheduler_frequency':
        {key: 's', args: 1, description: 'How frequently should we run the mailing list scheduler (lazy|aggressive)', default: 'lazy', mandatory: false},
    });

var app = express();
var compress = require('compression');
app.use(compress());
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
app.post('/subscribe', routes.subscribe);
app.post('/submit', routes.submit);
app.post('/pushcta', routes.pushCTA);
app.get('/items', routes.items);
app.get('/v/:id', routes.viewitem);
app.post('/s/:id', routes.share);
app.post('/f/:id', routes.favorite);
app.post('/uf/:id', routes.unfavorite);
app.post('/hideitem', routes.hideitem);
app.use(function(req, res) {
    console.log('Unable to find URI ' + req.url + ' redirecting back home');
    res.redirect('/');
});

app.set('port', config.port);

var MAILING_LIST = ops.mailing_list;
// The global mailgun object that will be used in other modules
var mg = require('mailgun-js')({apiKey: ops.mailgun_api, domain: ops.email_domain});

var mailinglist = require('./mailinglist');
var rule = new schedule.RecurrenceRule();
// TODO(hnag): Eventually when all the mailinglist code is complete don't run
// the scheduler so aggressively.
if (ops.scheduler_frequency == 'lazy') {
  console.log('Running the scheduler in the first minute of every hour');
  rule.minute = 1;
} else {
  console.log('Running the scheduler in the first second of every minute');
  rule.second = 1;
}
schedule.scheduleJob(rule, mailinglist.GetFresh);

// Start server
http.createServer(app).listen(app.get('port'), function() {
  console.log('Express listening on port ' + app.get('port'));
});

exports.submit_key = config.submitkey;
exports.pushnotificationkey = config.pushnotificationkey;
exports.mailgun = mg;
exports.MAILING_LIST = MAILING_LIST;
