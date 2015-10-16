/*!
 * app.js
 */
var stdio = require('stdio'),
    bodyParser = require('body-parser');

var ops = stdio.getopt({
    'port':
        {key: 'p', args: 1, description: 'the server port number', mandatory: false},
    'db':
        {key: 'd', args: 1, description: 'The agni db name', mandatory: true},
    'updatedb':
        {key: 'u', args: 1, description: 'EXERCISE EXTREME CAUTION: this command will update the database', mandatory: false},
    'submitkey':
        {key: 's', args: 1, description: 'Set key required to submit content to the agni db', mandatory: true}
    });

var http = require('http'),
    express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({
  extended: true
}));


var db_name = "";
if (ops.db) {
    db_name = ops.db;
}

// database setup
require( './db' ).init(db_name);
update_db = require('./update_db');
if(ops.updatedb) {
    func = "update_db_" + ops.updatedb;
    if(typeof update_db[func] === 'function') {
        update_db[func]();
    }
}

// Set up routes
var routes  = require( './routes' );
app.get('/', routes.index);
app.post('/submit', routes.submit);
app.get('/items', routes.items);

if (ops.port) {
    app.set('port', ops.port);
}

// Start server
http.createServer(app).listen(app.get('port'), function() {
    console.log('Express listening on port ' + app.get('port'));
});

exports.submit_key = ops.submitkey;
