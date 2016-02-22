// Setup basic express server
var _ = require('lodash');
var express = require('express');
var orm = require('orm');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3900;


orm.connect("mysql://friendite:password@www.friendite.com:3306/friendit_datingpro", function (err, db) {
  if (err) throw err;

    var Person = db.define("pro_user", {
        fname    : String,
        sname : String,
        login    : String,
        email : String,
        password: String
    }, {
        methods: {
            fullName: function () {
                return this.fname + ' ' + this.sname;
            }
        }
    });

});

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom
var numUsers = 0;

io.on('connection', function (socket) {
  console.log("new connection");
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new_message', function (data) {
    // we tell the client to execute 'new message'
    var sockets = io.sockets;

    var destinationSocket = _.findWhere(sockets,'username',data.username);

    if(destinationSocket){
        destinationSocket.emit('new_message',data); 
    }

  });

  // when the client emits 'add user', this listens and executes
  socket.on('add_user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    
    socket.broadcast.emit('user_online', {
      username: socket.username
    });

  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function (data) {

    var sockets = io.sockets;

    var destinationSocket = _.findWhere(sockets,'username',data.username);

    if(destinationSocket){
        destinationSocket.emit('typing',data); 
    }

  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop_typing', function (data) {

    var sockets = io.sockets;

    var destinationSocket = _.findWhere(sockets,'username',data.username);

    if(destinationSocket){
        destinationSocket.emit('stop_typing',data); 
    }

  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user_offline', {
        username: socket.username
      });
      
    }
  });
});