var tools = require('./lib/tools');
var config = tools.parseConfig(require('./config'));
var args = tools.parseArguments(process.argv.slice(2));
var execSync = require('child_process').execSync;
var moment = require('moment');
var fs = require('fs');
var W3CWebSocket = require('websocket').w3cwebsocket;
var Promise = require('promise');

var interval, gameName, thisGame, server, rcon;

var startTime = undefined;
var upAndRunningTime = undefined;

var updating = false;

var previousUpdateStarted = undefined;
var previousUpdateStopped = undefined;

var updateTimeFile = null;
var count = 1;

var millisecond    = 1;
var quarter_second  = 250   * millisecond;
var half_second     = 2     * quarter_second;
var second          = 2     * half_second;
var quarter_minute  = 15    * second;
var half_minute     = 2     * quarter_minute;
var minute          = 2     * half_minute;
var quarter_hour    = 15    * minute;
var half_hour       = 2     * quarter_hour;
var hour            = 2     * half_hour;

var checkInterval = half_hour;

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

    tools.text('Everything OK');
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
    }, second);
}

function rconConnect() {
    return new Promise(function (resolve, reject) {
        rcon = new W3CWebSocket('ws://' + thisGame.host + ':' + thisGame.rcon.port + '/' + thisGame.rcon.pass);
        rcon.onopen = function () {
            tools.text('RCON: Connected');
            count = 0;
            resolve(rcon);
        };
        rcon.onerror = function (error) {
            if ( count > half_hour ) {
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
            }, millisecond);
            count++;
        };

        // rcon.onclose = function () {
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
        //     }, 5 * second);
        //     count++;
        // };

        rcon.onmessage = function (e) {
            var data = JSON.parse(e.data);
            if (data.Message && data.Identifier >= 0) {
                tools.log(data.Message);
                if (data.Message === 'Server startup complete') {
                    upAndRunningTime = new Date();
                    var startupTime = Math.ceil((upAndRunningTime - startTime) / second);
                    if (updating) {
                        previousUpdateStopped = new Date();
                        previousUpdateSet(Math.ceil((previousUpdateStopped - previousUpdateStarted) / second));
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
        // || message.match(/^(Saved .* ents, serialization.*, write.*, disk.* totalstall)/i)
        // || message.match(/^(Saving complete)/i)
    );
}

function rconCmd(command) {
    tools.text('RCON: Sending command: ' + command);
    return new Promise(function (resolve, reject) {
        rcon.send(JSON.stringify({
            Identifier: -1,
            Message: command,
            Name: "WebRcon"
        }));
        resolve(rcon);
    });
}
function rconCmdWait(command, time) {
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

function rconSay(message) {
    return new Promise(function (resolve, reject) {
        rconCmd("say " + message).then(function () {
            resolve(true);
        });
    });
}

function rconSayRestart(message, time) {
    return new Promise(function(resolve, reject) {
        rconSay(message);
        setTimeout(function(){
            resolve();
        }, time);
    })
}

function restart() {
    return new Promise(function (resolve, reject) {
        // rconSayRestart('New updates, restarting in 1 hour', half_hour)
        // .then(function() { return rconSayRestart('New updates, restarting in 30 minutes', quarter_hour) })
        // .then(function() { return rconSayRestart('New updates, restarting in 15 minutes', 5 * minute) })
        // .then(function() { return rconSayRestart('New updates, restarting in 10 minutes', 5 * minute) })
        rconSayRestart('New updates, restarting in 10 minutes'+previousUpdateMessage(), 5 * minute)
        .then(function() { return rconSayRestart('New updates, restarting in 5 minutes'+previousUpdateMessage(), minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 4 minutes'+previousUpdateMessage(), minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 3 minutes'+previousUpdateMessage(), minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 2 minutes'+previousUpdateMessage(), minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 1 minute'+previousUpdateMessage(), quarter_minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 45 seconds'+previousUpdateMessage(), quarter_minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 30 seconds'+previousUpdateMessage(), quarter_minute) })
        .then(function() { return rconSayRestart('New updates, restarting in 15 seconds'+previousUpdateMessage(), 5 * second) })
        .then(function() { return rconSayRestart('New updates, restarting in 10...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 9...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 8...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 7...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 6...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 5...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 4...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 3...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 2...', second) })
        .then(function() { return rconSayRestart('New updates, restarting in 1...', second) })
        .then(function() { return rconSayRestart('New updates, restarting NOW!', second) })
        .then(function() { return rconCmdWait('server.save', second) })
        .then(function() { return rconCmdWait('quit', 5 * second) })
        .then(function() { return resolve() })
    });
}

function checkUpdatesTimeout() {
    clearTimeout(interval);

    tools.text('Setting update interval, every: '+tools.secondsToString(checkInterval / second));

    interval = setTimeout(function () {
        checkUpdates();
    }, checkInterval);
}


function checkUpdates() {
    clearTimeout(interval);
    tools.text('Checking updates');
    install();

    cd(thisGame.path);
    var latest_file = execSync("ls -tr " + thisGame.path + "/app_info_*.txt | tail -n 1").toString().replace(/\n/, '');
    var new_file = thisGame.path + "/app_info_" + moment().format('YYYY-MM-DD_HH-mm-ss') + ".txt";

    var previous_version, newest_version;

    cd(config.steam.path);
    // execSync("./steamcmd.sh +login anonymous +app_info_update 1 +app_info_print " + thisGame.appId + " +quit > " + new_file, {stdio: [0, 1, 2]});
    execSync("./steamcmd.sh +login anonymous +app_info_update 1 +app_info_print " + thisGame.appId + " +quit > " + new_file);

    previous_version = parseFile(latest_file);
    newest_version = parseFile(new_file);

    fs.unlinkSync(latest_file);

    if (previous_version && previous_version !== newest_version) {
        console.log('Old: ', previous_version);
        console.log('New: ', newest_version);

        if (server) {
            restart().then(function () {
                previousUpdateStarted = new Date();
                updating = true;
                // tools.text('Restarting server NOW');
                // server.kill('SIGHUP');
                tools.text('Server shutdown');
                tools.text('Starting in 5 seconds');
                setTimeout(function () {
                    install();
                    start();
                }, 5 * second);
            });
        }
    } else if (server) {
        tools.text('Updates checked, nothing new.');
        checkUpdatesTimeout();
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
    tools.text('Update took: '+tools.secondsToString(time));
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
    gameName = args.game;
    thisGame = config.games[gameName];

    if (args.command) {
        if (args.command == 'install') {
            install();
            start();
        }

        if (args.command == 'check') {
            checkUpdates();
        }

        if (args.command == 'update') {
            install();
        }

        if (args.command == 'start') {
            start();
        }

        if (args.command == 'updateStart') {
            install();
            start();
        }
    }
}
