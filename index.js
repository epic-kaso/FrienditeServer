// Setup basic express server
var _ = require('lodash');
var md5 = require('md5');
var express = require('express');
var orm = require('orm');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3900;
var bodyParser = require('body-parser');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));
app.use(orm.express("mysql://friendit_mobile:November8@205.234.204.6/friendit_datingpro", {
    define: function (db, models, next) {
        models.person = db.define("pro_user", {
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

        next();
    }
}));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// POST method route
app.post('/login', function (req, res) {
  var usernane = req.body.username;
  var password = req.body.password;

  req.models.person.one({or:[{login: username}, {email: username}],password: md5(password)},function(err,user){
    if(err)
      return res.status(412).json({error: 'Invaid Login Details!'});

    return res.json(user);

  });

});

// Chatroom
var numUsers = 0;


// data must have username: Destination Username & origin_username: Sender Username
io.on('connection', function (socket) {
  console.log("new connection");
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new_message', function (data) {
    // we tell the client to execute 'new message'
    var sockets = io.sockets.sockets;

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

    var sockets = io.sockets.sockets;

    var destinationSocket = _.findWhere(sockets,'username',data.username);

    if(destinationSocket){
        destinationSocket.emit('typing',data); 
    }

  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop_typing', function (data) {

    var sockets = io.sockets.sockets;

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