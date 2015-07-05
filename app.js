/*!
 * app.js
 */
var stdio = require('stdio');
var ops = stdio.getopt({
    'auth_token':
        {key: 'a', args: 1, description: 'The Telegram auth token', mandatory: true}
    });

var http = require('http'),
    express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

// Set up routes
var routes  = require( './routes' );
app.get('/me', routes.me);
app.get('/updates', routes.updates);
app.get('/set_webhook', routes.set_webhook);
app.get('/webhook', routes.webhook);

// Start server
http.createServer(app).listen(app.get('port'), function() {
    console.log('Express listening on port ' + app.get('port'));
});
exports.auth_token = ops.auth_token;
