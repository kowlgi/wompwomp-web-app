var stdio = require('stdio'),
    bodyParser = require('body-parser'),
    jade = require('jade'),
    path = require('path'),
    util = require('util'),
    favicon = require('serve-favicon'),
    schedule = require('node-schedule'),
    http = require('http'),
    express = require('express'),
    config = require('./config'),
    logger = require('morgan');
    cookieParser = require('cookie-parser'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    ConnectRoles = require('connect-roles');

var ops = stdio.getopt({
    'updatedb':
        {key: 'u', args: 1, description: 'EXERCISE EXTREME CAUTION: this command will update the database', mandatory: false},
    'mailgun_api':
        {key: 'm', args: 1, description: 'The mailgun API key. Invalid API = no email notifications', mandatory: false},
    'email_domain':
        {key: 'e', args: 1, description: 'The deckrank email domain. Invalid domain = no email notifications', mandatory: false},
    'mailing_list':
        {key: 'l', args: 1, description: 'Who to send the mail to', default: 'fun@mg.wompwomp.co', mandatory: false},
    });

var app = express();
var compress = require('compression');
app.use(compress());
app.set('port', process.env.PORT || 3000);
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.locals.moment_local = require('moment-timezone');

exports.contentdb = mongoose.createConnection('mongodb://localhost/' + config.db);
require('./content').init(exports.contentdb);
update_db = require('./update_db');
if(ops.updatedb) {
    func = "update_db_" + ops.updatedb;
    if(typeof update_db[func] === 'function') {
        update_db[func]();
    }
}

var FileStreamRotator = require('file-stream-rotator')
var fs = require('fs')
var logDirectory = __dirname + '/log'
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)
// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
  filename: logDirectory + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false
})
// setup the logger
app.use(logger('combined', {stream: accessLogStream}))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var user = new ConnectRoles({
  failureHandler: function (req, res, action) {
    // optional function to customise code that runs when
    // user fails authorisation
    var accept = req.headers.accept || '';
    res.status(403);
    if (~accept.indexOf('html')) {
      res.render('404');
    } else {
      res.send('Access Denied - You don\'t have permission to: ' + action);
    }
  }
});

app.use(express.static(__dirname +'/public'));
app.use('/v', express.static(__dirname +'/public'));
app.disable('etag');

exports.logindb = mongoose.createConnection('mongodb://localhost/agnilogin');
require('./account').init(exports.logindb);
var Account = exports.logindb.model('Accounts');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());
app.use(user.middleware());

//anonymous users can only access the home page
//returning false stops any more rules from being
//considered
user.use(function (req, action) {
  if (!req.isAuthenticated()) return action === 'access public page';
})

//moderator users can access private page, but
//they might not be the only ones so we don't return
//false if the user isn't a moderator
user.use('access private page', function (req) {
  if (req.user.role === 'contributor') {
    return true;
  }
})

//admin users can access all pages
user.use(function (req) {
  if (req.user.role === 'admin') {
    return true;
  }
});
exports.user = user;

// Set up routes
var routes  = require( './routes' );
app.use('/', routes.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error("http://wompwomp.co"+ req.url + ' wasn\'t found. Please check the URL.');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}
else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    });
}

app.set('port', config.port);

var MAILING_LIST = ops.mailing_list;
// The global mailgun object that will be used in other modules
var mg = require('mailgun-js')({apiKey: ops.mailgun_api, domain: ops.email_domain});

var mailinglist = require('./mailinglist');
schedule.scheduleJob(config.mailing_list_scheduler_frequency, mailinglist.GetFresh);
schedule.scheduleJob(config.release_content_scheduler_frequency, routes.releaseBufferedContent);
schedule.scheduleJob(config.push_notification_scheduler_frequency, routes.pushContentNotification);

// Start server
http.createServer(app).listen(app.get('port'), function() {
  util.log('Express listening on port ' + app.get('port'));
});

exports.submit_key = config.submitkey;
exports.pushnotificationkey = config.pushnotificationkey;
exports.mailgun = mg;
exports.MAILING_LIST = MAILING_LIST;
