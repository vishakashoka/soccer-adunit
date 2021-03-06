#!/bin/env node
//  OpenShift sample Node application
var fs      = require('fs');
var express = require("express");
var app = express();

app.use(express.static(__dirname + '/public'));
app.set('port', process.env.PORT || 5000); 

var server = require('http').createServer(app).listen(app.get('port'));
var io = require('socket.io').listen(server);

// io.configure(function () {
//     io.set("transports", ["xhr-polling"]);
//     io.set("polling duration", 10);
//     io.set("log level", 1);
// });
 
//app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

/**
 *  Define the sample application.
 */
var SoccerApp = function() {

    //  Scope.
    var self = this;
    var client = {};
    var sockets = [];
    var goliWasRefreshed = false;
    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        // Clients tracking
        client.player = {};
        client.player.status = 'inactive';
        client.goli = {};
        client.goli.status = 'inactive';

        clientCount = 0;
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = {
                'host.html': '',
                'player.html': '',
                'goli.html': ''
            };
        }

        //  Local cache for static content.
        self.zcache['host.html'] = fs.readFileSync('./host.html');
        self.zcache['player.html'] = fs.readFileSync('./player.html');
        self.zcache['goli.html'] = fs.readFileSync('./goli.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating Soccer App ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Soccer Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    /**
     *  Setup all the events that socket server should listen from the client
     */
    self.setupSocketListeners = function() {
        io.sockets.on('connection', function (socket) {
        var socketZ = {

                handleClientMessage: function(msg) {
                  // expand ad signal received from player via server
                  if(msg.event === 'expand') {
                    console.log("Received expand AD request from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending expand Ad signal it to Goli.");
                        io.emit('message', {'event': 'expand', 'to': 'goli'});
                    } else {
                        console.log('Goli is inactive. Could not send expand Ad signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }

                  // readyToKick signal received from player via server
                  if(msg.event === 'readyToKick') {
                    console.log("Received readyToKick notification from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending readyToKick signal it to Goli.");
                        io.emit('message', {'event': 'readyToKick', 'to': 'goli'});
                        socket.emit('ackmessage', 'ACK');
                    } else {
                        console.log('Goli is inactive. Could not send readyToKick signal.');
                    }
                  }

                  // dragStart signal received from player via server
                  if(msg.event === 'dragStart') {
                    console.log("Received dragStart signal from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending dragStart signal it to Goli.");
                        io.emit('message', {'event': 'dragStart', 'to': 'goli'});
                    } else {
                        console.log('Goli is inactive. Could not send dragStart signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }

                  // dragEnd signal received from player via server
                  if(msg.event === 'dragEnd') {
                    console.log("Received dragEnd signal from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending dragEnd signal it to Goli.");
                        io.emit('message', {'event': 'dragEnd', 'to': 'goli', 'kickAngle': msg.kickAngle});
                    } else {
                        console.log('Goli is inactive. Could not send dragEnd signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }

                  // resetGame signal received from player via server
                  if(msg.event === 'resetGame') {
                    console.log("Received resetGame signal from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending resetGame signal it to Goli.");
                        io.emit('message', {'event': 'resetGame', 'to': 'goli'});
                    } else {
                        console.log('Goli is inactive. Could not send resetGame signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }

                  // resetBall signal received from goli via server
                  if(msg.event === 'resetBall') {
                    console.log("Received resetBall signal from goli");

                    if(client.player.status === 'active') {
                        console.log("Server sending resetBall signal it to Player.");
                        io.emit('message', {'event': 'resetBall', 'to': 'player'});
                    } else {
                        console.log('Player is inactive. Could not send resetBall signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }

                  // gameOver signal received from goli via server
                  if(msg.event === 'gameOver') {
                    console.log("Received gameOver signal from goli");

                    if(client.player.status === 'active') {
                        console.log("Server sending gameOver signal it to Player.");
                        io.emit('message', {'event': 'gameOver', 'to': 'player'});
                    } else {
                        console.log('Player is inactive. Could not send gameOver signal.');
                        socket.emit('ackmessage', 'ACK');
                    }
                  }
                },

                captureClientIdentity: function(identity) {
                    if(identity === 'player' && client.player.status === 'active') {
                        client.player.id = socket.id;
                        client.player.socket = socket;
                        console.log('Identity : Player identity received : '+socket.id);
                    } else if(identity === 'goli' && client.goli.status === 'active') {
                        client.goli.id = socket.id;
                        client.goli.socket = socket;
                        console.log('Identity : Goli identity received : '+socket.id);
                    } else {
                        console.log('Unidentified Client identity received');
                    }

                    // If both clients registered. Send them success message
                    if(typeof client.player.id != 'undefined' && typeof client.goli.id != 'undefined') {
                        console.log("Broadcasting. Clients are ready!");
                        io.sockets.emit('ackmessage', {'event': 'identity', 'registered': 'true'});
                    }
                },

                goliStatus: function(msg) {
                  if(socket.id == client.player.id) {
                    console.log("Received goli status request from player. Responding back");
                    socket.emit('ackmessage', {'event': 'pingGoli', 'goliStatus': client.goli.status ? 'true' : 'false'});
                  }
                },

                playerStatus: function(msg) {
                    if(socket.id == client.goli.id) {
                      console.log("Received player status request from goli. Responding back");
                      socket.emit('ackmessage', {'event': 'pingPlayer', 'playerStatus': client.player.status ? 'true' : 'false'});
                    }
                },

                handleClientAckMessage: function(amsg) {
                  console.log('ask-message Received: ', msg);
                },

                handleClientDisconnect: function(e) {
                  // Update status
                  if(socket.id === client.player.id) {
                    client.player.status = 'inactive';
                    console.log('Player got disconnected : id = '+socket.id);
                    io.emit('playerDisconnect', 'Notifying goli');
                    socket.emit('ackmessage', 'ACK');
                  } else if(socket.id === client.goli.id) {
                    client.goli.status = 'inactive';
                    console.log('Goli got disconnected : id = '+socket.id);
                    io.emit('goliDisconnect', 'Notifying player');
                    socket.emit('ackmessage', 'ACK');
                  }
                },

                handleClientConnect: function(e) {
                  console.log('Client got connected');
                  clientCount++;
                },

                sendCustomEventAndMsg: function(eName, msg) {
                  eName = ''+eName;
                  msg = ''+msg;
                  socket.broadcast.emit(eName, msg);
                },

                // RESET CODE
                handleResetAppRequest: function() {
                  // Broadcast message to goli only. We need goli to refresh before the player.
                  // Send the same command to player when is reloaded.
                  io.emit('message', {'event': 'refresh', 'to': 'goli'});
                  socket.emit('ackmessage', 'ACK');
                  // If this is true, when goli refresh is done , goli registers 
                  // identity with server, we use this flag to say goli to expand 
                  // ad without waiting for the player to send expand signal
                  goliWasRefreshed = true;
                  self.resetServer();
                },

                // RESET CODE
                goliRefreshed: function() {
                  // RESET CODE
                  if(goliWasRefreshed) {
                    // Tell him to expand without waiting for player to expand
                    if(client.goli.status === 'active') {
                      console.log("Goli was Refreshed on server reset : So sending expand Ad signal to Goli.");
                      setTimeout(function() { socket.emit('message', {'event': 'expand', 'to': 'goli'}); }, 3000);
                    } else {
                      console.log('Goli was Refreshed on server reset : But goli is inactive. Could not send expand Ad signal.');
                    }
                    goliWasRefreshed = false;

                    // Now send refresh signal to player
                    //io.emit('message', {'event': 'refresh', 'to': 'player'});
                  }
                }
            }

            // Received a 'message' from client and send an 'ack-message' back
            socket.on('message', socketZ.handleClientMessage);

            // Receive client identity when socket is ready on the client end
            socket.on('identity', socketZ.captureClientIdentity);

            // Player checking goli status
            socket.on('pingGoli', socketZ.goliStatus);

            // Goli checking player status
            socket.on('pingPlayer', socketZ.playerStatus);

            // Received a 'ack-message' from client
            socket.on('ack-message', socketZ.handleClientAckMessage);

            // Client got 'disconnected'
            socket.on('disconnect', socketZ.handleClientDisconnect);

            // Client got 'connected'
            socket.on('connection', socketZ.handleClientConnect);

            // Reset App request from player.
            socket.on('resetApp', socketZ.handleResetAppRequest);

            // Refresh complete event from goli
            socket.on('goliLoaded', socketZ.goliRefreshed);
        });
    };

    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/robo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/host'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('host.html') );
        };

        self.routes['/player'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('player.html') );

            // Set player status active
            client.player.status = 'active';
        };

        self.routes['/goli'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('goli.html') );

            // Set goli status active
            client.goli.status = 'active';
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = app;

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };

    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        console.log("Server initializing");

        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();

        // Setup sockets events and listeners
        self.setupSocketListeners();
    };

    // RESET CODE
    self.resetServer = function() {
      console.log("Server Restarting");

      // Reset server variables.
      self.initialize();
      self.start();
    }

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        server.listen(app.get('port'), function() {
            console.log('%s: Soccer App started on PORT : %d',
                        Date(Date.now() ), app.get('port'));
        });
    };

};   /*  Soccer Application.  */



/**
 *  main():  Main code.
 */
var soccerApp = new SoccerApp();
soccerApp.initialize();
soccerApp.start();