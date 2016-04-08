var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var r = require('rethinkdb');
var config = require('./config.js');

function createTable(connection, callback) {
  //Create the table if needed.
  r.tableList().contains('comments').do(function(containsTable) {
    return r.branch(
      containsTable,
      {created: 0},
      r.tableCreate('comments')
    );
  }).run(connection, function(err, result) {
    callback(err, result);
  });
}

function createIndex(connection, callback) {
  //Create the index if needed.
  r.table('comments').indexList().contains('timestamp').do(function(hasIndex) {
    return r.branch(
      hasIndex,
      {created: 0},
      r.table('comments').indexCreate('timestamp')
    );
  }).run(connection, function(err, result) {
    callback(err, result);
  });
}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function onIoConnection(dbConnection) {

  r.table('comments').changes().run(connection, function(err, cursor) {
    if (err) throw err;
    cursor.each(function(err, row) {
      if (err) throw err;
      console.log(JSON.stringify(row, null, 2));
      io.emit('chat message', row.new_val.message);
    });
  });

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
      }).run(dbConnection, function(err, result) {
        if (err) throw err;
        console.log(JSON.stringify(result, null, 2));
      });
      console.log('message: ' + msg);
    });
  });
}

var connection = null;
r.connect(config.rethinkdb, function(err, conn) {
  if (err) throw err;
  connection = conn;
  
  createTable(connection, function(err, result) {
    if (err) throw err;
    console.log(JSON.stringify(result, null, 2));
    createIndex(connection, function(err, result) {
      if (err) throw err;
      http.listen(3000, function(){
        console.log('listening on *:3000');
        onIoConnection(connection);
      });
    });
  });
});
