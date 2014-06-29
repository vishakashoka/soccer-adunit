#!/bin/env node
//  OpenShift sample Node application
var fs      = require('fs');
var express = require("express");
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.PORT || 5000);  
//app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

/**
 *  Define the sample application.
 */
var SoccerApp = function() {

    //  Scope.
    var self = this;
    var client = {};
    var sockets = [];

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
                'index.html': '',
                'player.html': '',
                'goli.html': ''
            };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
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
                    }
                  }

                  // readyToKick signal received from player via server
                  if(msg.event === 'readyToKick') {
                    console.log("Received readyToKick notification from player");

                    if(client.goli.status === 'active') {
                        console.log("Server sending readyToKick signal it to Goli.");
                        io.emit('message', {'event': 'readyToKick', 'to': 'goli'});
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
                    }
                  }

                  // resetBall signal received from player via server
                  if(msg.event === 'resetBall') {
                    console.log("Received resetBall signal from goli");

                    if(client.player.status === 'active') {
                        console.log("Server sending resetBall signal it to Player.");
                        io.emit('message', {'event': 'resetBall', 'to': 'player'});
                    } else {
                        console.log('Player is inactive. Could not send resetBall signal.');
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
                    console.log("Received goli status request from player. Responding back");
                    socket.emit('ackmessage', {'event': 'pingGoli', 'goliStatus': client.goli.status ? 'true' : 'false'});
                },

                playerStatus: function(msg) {
                    console.log("Received player status request from goli. Responding back");
                    socket.emit('ackmessage', {'event': 'pingPlayer', 'playerStatus': client.player.status ? 'true' : 'false'});
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
                  } else if(socket.id === client.goli.id) {
                    client.goli.status = 'inactive';
                    console.log('Goli got disconnected : id = '+socket.id);
                    io.emit('goliDisconnect', 'Notifying player');
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

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
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
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();

        // Setup sockets events and listeners
        self.setupSocketListeners();
    };


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