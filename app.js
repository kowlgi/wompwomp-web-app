/*!
 * app.js
 */
var stdio = require('stdio');
var ops = stdio.getopt({
    'port':
        {key: 'p', args: 1, description: 'the server port number', mandatory: false},
    'db':
        {key: 'd', args: 1, description: 'The agni db name', mandatory: true},
    });

var http = require('http'),
    express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);

var db_name = "";
if (ops.db) {
    db_name = ops.db;
}

// database setup
//require( './db' ).init(db_name);

// Set up routes
var routes  = require( './routes' );
app.get('/', routes.index);
app.get('/submit', routes.submit);
app.get('/showall', routes.showall);

if (ops.port) {
    app.set('port', ops.port);
}

// Start server
http.createServer(app).listen(app.get('port'), function() {
    console.log('Express listening on port ' + app.get('port'));
});
