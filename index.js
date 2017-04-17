var tools = require('./lib/tools');
var config = tools.parseConfig(require('./config'));
var args = tools.parseArguments(process.argv.slice(2));
var execSync = require('child_process').execSync;
var moment = require('moment');
var fs = require('fs');
var W3CWebSocket = require('websocket').w3cwebsocket;
var Promise = require('promise');

const times = require('./lib/constants');

var interval, thisGame, server, rcon;

var startTime = undefined;
var upAndRunningTime = undefined;

var updating = false;

var previousUpdateStarted = undefined;
var previousUpdateStopped = undefined;

var updateTimeFile = null;
var count = 1;

var checkInterval = times.half_hour;

var connected = false;

function install() {
    if (!tools.folderExists(config.steam.path)) {
        tools.folderCreate(config.steam.path);
    }

    if (!tools.fileExists(config.steam.path + '/' + config.steam.command)) {
        tools.steamInstall(config.steam);
    }

    for (var i = 0, len = Object.keys(config.games).length; i < len; i++) {
        var thisGame = config.games[Object.keys(config.games)[i]];
        tools.gameInstall(thisGame);
        updateTimeFile = thisGame.path + '/'+thisGame.server.name+'_update_time.txt';
    }

    if (!server) {
        tools.text('Steam and '+thisGame.server.name+' are installed');
    }
}

function start() {
    server = tools.startGame(args.game);
    tools.text('Server started!');
    startTime = new Date();
    upAndRunningTime = undefined;
    setTimeout(function(){
        count = 1;
        tools.text('RCON: Connecting...');
        rconConnect()
            .then(
                function(){

                },
                function(error) {
                    console.log(error);
                }
            );
    }, times.second);
}

function rconConnect() {
    return new Promise(function (resolve, reject) {
        rcon = new W3CWebSocket('ws://' + thisGame.host + ':' + thisGame.rcon.port + '/' + thisGame.rcon.pass);
        rcon.onopen = function () {
            tools.text('RCON: Connected');
            count = 0;
            connected = true;
            resolve(rcon);
        };
        rcon.onerror = function (error) {
            if (connected === true) {
                tools.text('RCON: Connection failed!');
                connected = false;
            }
            if ( count > times.half_hour ) {
                tools.text('RCON: Connection failed!');
                reject(rcon);
            }
            setTimeout(function () {
                return rconConnect()
                    .then(
                        function(){
                            resolve();
                        },
                        function(error) {
                            reject(error);
                        }
                    );
            }, times.millisecond);
            count++;
        };

        rcon.onclose = function () {
            if (connected === true) {
                tools.text('RCON: Connection closed!');
                connected = false;
                tools.text('RCON: Reconnecting...');
                rconConnect();
            }
        //     tools.text('RCON: Retrying connection in 5 seconds');
        //     setTimeout(function () {
        //         return rconConnect()
        //             .then(
        //                 function(){
        //                     resolve();
        //                 },
        //                 function(error) {
        //                     reject(error);
        //                 }
        //             );
        //     }, 5 * times.second);
        //     count++;
        };

        rcon.onmessage = function (msg) {
            var data = JSON.parse(msg.data);
            if (data.Message && data.Identifier >= 0 && !ignoreRow(data.Message)) {
                tools.log(data.Message);
                if (data.Message === 'Server startup complete') {
                    upAndRunningTime = new Date();
                    var startupTime = Math.ceil((upAndRunningTime - startTime) / times.second);
                    if (updating) {
                        previousUpdateStopped = new Date();
                        var updateTimeTook = Math.ceil((previousUpdateStopped - previousUpdateStarted) / times.second);
                        tools.text('Update took: '+tools.secondsToString(updateTimeTook));
                        previousUpdateSet(updateTimeTook);
                        updating = false;
                    } else {
                        previousUpdateSet(startupTime + 30);
                    }
                    tools.text('Server startup took: '+ tools.secondsToString(startupTime));
                    checkUpdatesTimeout();
                }
            }
        };
    });
}

function ignoreRow(message) {
    return !!(
        message.match(/^(NullReferenceException)/i)
        || message.match(/^(Saved .* ents, serialization.*, write.*, disk.* totalstall)/i)
    );
}

function rconCmd(command, time) {
    tools.text('RCON: Sending command: ' + command);
    return new Promise(function (resolve, reject) {
        rcon.send(JSON.stringify({
            Identifier: -1,
            Message: command,
            Name: "WebRcon"
        }));
        setTimeout(function(){
            resolve();
        }, time);
    });
}

function rconSay(message, time) {
    return new Promise(function (resolve, reject) {
        rconCmd("say " + message, time)
            .then(function () {
                resolve(true);
            });
    });
}

function restart() {
    return new Promise(function (resolve, reject) {
        rconSay('New updates, restarting in 30 minutes'+previousUpdateMessage(), 10 * times.minute)
            .then(function() { return rconSay('New updates, restarting in 20 minutes'+previousUpdateMessage(), 10 * times.minute) })
            .then(function() { return rconSay('New updates, restarting in 10 minutes'+previousUpdateMessage(), 5 * times.minute) })
            .then(function() { return rconSay('New updates, restarting in 5 minutes'+previousUpdateMessage(), times.minute) })
            .then(function() { return rconSay('New updates, restarting in 4 minutes'+previousUpdateMessage(), times.minute) })
            .then(function() { return rconSay('New updates, restarting in 3 minutes'+previousUpdateMessage(), times.minute) })
            .then(function() { return rconSay('New updates, restarting in 2 minutes'+previousUpdateMessage(), times.minute) })
            .then(function() { return rconSay('New updates, restarting in 1 minute'+previousUpdateMessage(), times.quarter_minute) })
            .then(function() { return rconSay('New updates, restarting in 45 seconds'+previousUpdateMessage(), times.quarter_minute) })
            .then(function() { return rconSay('New updates, restarting in 30 seconds'+previousUpdateMessage(), times.quarter_minute) })
            .then(function() { return rconSay('New updates, restarting in 15 seconds'+previousUpdateMessage(), 5 * times.second) })
            .then(function() { return rconSay('New updates, restarting in 10...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 9...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 8...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 7...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 6...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 5...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 4...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 3...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 2...', times.second) })
            .then(function() { return rconSay('New updates, restarting in 1...', times.second) })
            .then(function() { return rconSay('New updates, restarting NOW!', times.second) })
            .then(function() { return rconCmd('server.save', times.second) })
            .then(function() { return rconCmd('quit', 5 * times.second) })
            .then(function() { return resolve() })
    });
}

function checkUpdatesTimeout() {
    clearTimeout(interval);

    tools.text('Checking updates in: '+tools.secondsToString(checkInterval / times.second));

    interval = setTimeout(function () {
        checkUpdates();
    }, checkInterval);
}


function checkUpdates() {
    clearTimeout(interval);
    install();

    cd(thisGame.path);
    var latest_file = execSync("ls -tr " + thisGame.path + "/app_info_*.txt | tail -n 1").toString().replace(/\n/, '');
    var new_file = thisGame.path + "/app_info_" + moment().format('YYYY-MM-DD_HH-mm-ss') + ".txt";

    var previous_version, newest_version;

    cd(config.steam.path);
    execSync("./steamcmd.sh +login anonymous +app_info_update 1 +app_info_print " + thisGame.appId + " +quit > " + new_file);

    previous_version = parseFile(latest_file);
    newest_version = parseFile(new_file);

    fs.unlinkSync(latest_file);

    if (previous_version && previous_version !== newest_version) {
        tools.text('New updates!');

        // console.log('Old: ', previous_version);
        // console.log('New: ', newest_version);

        if (server) {
            restart().then(function () {
                server = undefined;
                previousUpdateStarted = new Date();
                updating = true;
                tools.text('Server shutdown');
                tools.text('Starting in 5 seconds');
                setTimeout(function () {
                    install();
                    start();
                }, 5 * times.second);
            });
        }
    }
    else if (server) {
        checkUpdatesTimeout();
    }
    else {
        tools.text('Server is up-to-date');
    }
}

function parseFile(file) {
    var parsed = execSync('grep -i -A 1000 "branches" ' + file + ' | grep "public" -A 4');
    return parsed.toString().replace("\n", '');
}

function previousUpdateGet() {
    if (fs.existsSync(updateTimeFile)) {
        return fs.readFileSync(updateTimeFile);
    }

    return undefined;
}

function previousUpdateSet(time) {
    fs.writeFileSync(updateTimeFile, time);
}

function previousUpdateMessage() {
    var previousUpdateTime = previousUpdateGet();
    if (previousUpdateTime) {
        return ', previous update took ' + tools.secondsToString(previousUpdateTime);
    }

    return '';
}

if (args.game) {
    thisGame = config.games[args.game];

    if (args.command) {
        if (args.command == 'install') {
            install();
        }

        if (args.command == 'check') {
            checkUpdates();
        }

        if (args.command == 'start') {
            install();
            start();
        }

        if (args.command == 'plain-start') {
            start();
        }
    }
}
