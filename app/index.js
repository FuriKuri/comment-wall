var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var r = require('rethinkdb');
var config = require('./config.js');
var async = require('async');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/foundation.min.css', function(req, res){
  res.sendFile(__dirname + '/foundation.min.css');
});

function onIoConnection(connection) {
  setTimeout(function() {
    r.table('comments').changes().run(connection, function(err, cursor) {
      if (err) throw err;
      cursor.each(function(err, row) {
        if (err) throw err;
        console.log(JSON.stringify(row, null, 2));
        io.emit('chat message', row.new_val.message);
      });
    });
  }, 2000);

  io.on('connection', function(socket){
    console.log('a user connected');

    r.table('comments').orderBy({index: 'timestamp'}).run(connection, function(err, cursor) {
      if (err) throw err;
      cursor.toArray(function(err, result) {
      	result.forEach(function(element) {
          socket.emit('chat message', element.message);
      	});
        if (err) throw err;
        console.log(JSON.stringify(result, null, 2));
      });
    });

    socket.on('chat message', function(msg){
      r.table('comments').insert({
        message: msg,
        timestamp: new Date()
      }).run(connection, function(err, result) {
        if (err) throw err;
        console.log(JSON.stringify(result, null, 2));
      });
      console.log('message: ' + msg);
    });
  });
}

function startExpress(connection) {
  http.listen(3000, function() {
    console.log('listening on *:3000');
    onIoConnection(connection);
  });
}

async.waterfall([
  function connect(callback) {
    r.connect(config.rethinkdb, callback);
  },
  function createDatabase(connection, callback) {
    //Create the database if needed.
    r.dbList().contains(config.rethinkdb.db).do(function(containsDb) {
      return r.branch(
        containsDb,
        {created: 0},
        r.dbCreate(config.rethinkdb.db)
      );
    }).run(connection, function(err) {
      callback(err, connection);
    });
  },
  function createTable(connection, callback) {
    //Create the table if needed.
    r.tableList().contains('comments').do(function(containsTable) {
      return r.branch(
        containsTable,
        {created: 0},
        r.tableCreate('comments')
      );
    }).run(connection, function(err) {
      callback(err, connection);
    });
  },
  function createIndex(connection, callback) {
    //Create the index if needed.
    r.table('comments').indexList().contains('timestamp').do(function(hasIndex) {
      return r.branch(
        hasIndex,
        {created: 0},
        r.table('comments').indexCreate('timestamp')
      );
    }).run(connection, function(err) {
      callback(err, connection);
    });
  },
  function waitForIndex(connection, callback) {
    //Wait for the index to be ready.
    r.table('comments').indexWait('timestamp').run(connection, function(err, result) {
      callback(err, connection);
    });
  }
], function(err, connection) {
  if(err) {
    console.error(err);
    process.exit(1);
    return;
  }

  startExpress(connection);
});
