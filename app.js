const   stdio = require('stdio'),
        bodyParser = require('body-parser'),
        jade = require('jade'),
        path = require('path'),
        winstonpkg = require('winston'),
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
        ConnectRoles = require('connect-roles'),
        flash = require('express-flash');

winston = new (winstonpkg.Logger)({
    transports: [
      new (winstonpkg.transports.Console)({'timestamp':true})
    ]
});
exports.winston = winston;

const ops = stdio.getopt({
    'updatedb':
      {key: 'u', args: 1, description: 'EXERCISE EXTREME CAUTION: this command will update the database', mandatory: false},
    'realm':
      {key: 'r', args: 1, description: 'Realm are we running in [test|prod]?', default: 'test', mandatory: true},
    });

if(ops.realm != "test" && ops.realm != "prod") {
    console.log("Error: set realm to one of the valid values: test/prod");
    process.exit();
}

const app = express();
const compress = require('compression');
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

const FileStreamRotator = require('file-stream-rotator')
const fs = require('fs')
const logDirectory = __dirname + '/log'
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)
// create a rotating write stream
const accessLogStream = FileStreamRotator.getStream({
  filename: logDirectory + '/access-%DATE%.log',
  frequency: 'daily',
  verbose: false,
  date_format: 'YYYY-MM-DD'
})
// setup the logger
logger.token('remote-addr', function(req, res){ return req.header('x-forwarded-for') || req.connection.remoteAddress; });
app.use(logger(
    ':remote-addr - [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms',
    {stream: accessLogStream}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
const session = require('express-session');
const MongoStore = require('connect-mongo/es5')(session);
const sessionStoreConnection = mongoose.createConnection('mongodb://localhost/' + config.sessiondb);
app.use(session({
    secret: config.session_secret,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: sessionStoreConnection })
}));
app.use(passport.initialize());
app.use(passport.session());

const user = new ConnectRoles({
  failureHandler: function (req, res, action) {
    // optional function to customise code that runs when
    // user fails authorisation
    const accept = req.headers.accept || '';
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
app.use('/edititem', express.static(__dirname +'/public'));
app.disable('etag');

exports.userstatsdb = mongoose.createConnection('mongodb://localhost/' + config.userstatsdb);
require('./userstats').init(exports.userstatsdb);
exports.logindb = mongoose.createConnection('mongodb://localhost/' + config.logindb);
require('./account').init(exports.logindb);
const Account = exports.logindb.model('Accounts');
passport.use(new LocalStrategy(
    {
        usernameField: 'email'
    },
    Account.authenticate()));
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

// Set up for flash messages
app.use(flash());

// Set up routes
const routes  = require( './routes' );
app.use('/', routes.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    const err = new Error("http://wompwomp.co"+ req.url + ' wasn\'t found. Please check the URL.');
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

var mailing_list_frequency = config.prod_mailing_list_scheduler_frequency;
var MAILING_LIST = config.test_mailing_list;
if (ops.realm == 'test') {
  mailing_list_frequency = config.test_mailing_list_scheduler_frequency;
} else if (ops.realm == 'prod') {
  MAILING_LIST = config.prod_mailing_list;
};

winston.info('Running in realm ' + ops.realm + ' and sending emails to: ' + MAILING_LIST + ' at frequency ' + mailing_list_frequency);

// The global mailgun object that will be used in other modules
const mg = require('mailgun-js')({apiKey: config.mailgun_key, domain: config.email_domain});

const mailinglist = require('./mailinglist');
schedule.scheduleJob(mailing_list_frequency , mailinglist.GetFresh);
schedule.scheduleJob(config.release_content_scheduler_frequency, routes.releaseBufferedContent);
schedule.scheduleJob(config.push_notification_scheduler_frequency, routes.pushContentNotification);
schedule.scheduleJob(config.push_share_card_scheduler_frequency, routes.pushShareCard);
schedule.scheduleJob(config.push_rate_card_scheduler_frequency, routes.pushRateCard);
schedule.scheduleJob(config.push_upgrade_card_scheduler_frequency, routes.pushUpgradeCard);
schedule.scheduleJob(config.push_remove_all_cta_scheduler_frequency, routes.pushRemoveAllCTA);

// Start server
http.createServer(app).listen(app.get('port'), function() {
  winston.info('Express listening on port ' + app.get('port'));
});

exports.submit_key = config.submitkey;
exports.pushnotificationkey = config.pushnotificationkey;
exports.mailgun = mg;
exports.MAILING_LIST = MAILING_LIST;
exports.mailing_list_scheduler_frequency = mailing_list_frequency;
