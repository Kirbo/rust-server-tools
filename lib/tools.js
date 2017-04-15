var fs = require('fs');
var include = require('./include');
var util = require('util');
var clc = require('cli-color');
var execSync = require('child_process').execSync;
var spawn = require('child_process').spawn;
require('shelljs/global');

module.exports = {

	_conf: {},

    text: function(text, border) {
        console.log('['+new Date+'] '+clc.green(text));
        if ( border ) {
            console.log(clc.white.bold('****************')+"\n");
        }
    },

    log: function(text) {
        console.log('['+new Date+'] '+text);
    },

	getUserHome: function() {
		return process.env['HOME'];
	},

	folderExists: function(dir) {
		if (!fs.existsSync(dir)){
			return false;
		}
		else {
			return true;
		}
	},

	folderCreate: function(dir) {
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}
	},

	fileExists: function(dir) {
		if (!fs.existsSync(dir)){
			return false;
		}
		return true;
	},


	steamInstall: function(config) {
		this.text('Downloading: Steam');
		cd(config.path);
		execSync("curl -sqLk 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz' | tar xzf -");

		this.text('Installing: Steam');
        execSync("./steamcmd.sh +login anonymous +quit", {silent:true});

	},

	replaceTilde: function(value) {
		return value.replace('~', this.getUserHome);
	},

	parseConfig: function(config) {
		var newConfig = config;
		newConfig.steam.path = this.replaceTilde(newConfig.steam.path);
		newConfig.steam.command = include.steam.command;

		var newGames = {};

		for (var i = 0, len = newConfig.games.length; i < len; i++ ) {
			var thisGame = newConfig.games[i];
			var includeGame = include.games[thisGame.game];

			var newGame = {
				path: this.replaceTilde(thisGame.path),
				appId: includeGame.appId,
				command: includeGame.command,
				name: includeGame.name
			};

			newGames[thisGame.game] = util._extend(newConfig.games[i], newGame);
			delete newGames[thisGame.game].game;

		};

		this._conf = newConfig;
		this._conf.games = newGames;

		return newConfig;
	},

	gameInstall: function(game) {
		var status = '';
		if ( this.folderExists(game.path) ) {
			status = 'Updating';
		}
		else {
			status = 'Installing';
		}

		this.text(status+': '+game.name);

		// var command = "cd "+this._conf.steam.path +" && ./steamcmd.sh +login anonymous +force_install_dir "+game.path+" +app_update "+game.appId+" +quit";

		cd(this._conf.steam.path);
		// execSync("./steamcmd.sh +login anonymous +force_install_dir "+game.path+" +app_update "+game.appId+" +quit", {stdio:[0,1,2]});
		execSync("./steamcmd.sh +login anonymous +force_install_dir "+game.path+" +app_update "+game.appId+" +quit");

	},

	parseArguments: function(arguments) {
		var newArguments = {};
		arguments.forEach(function(argument) {
			var split = argument.split('=');
			var object = {};

			if ( !split[1] ) {
				split[1] = split[0];
				split[0] = 'command';
			}

			newArguments[split[0]] = split[1];
		});

		return newArguments;
	},







    secondsToString: function(seconds) {
		var returnValue = [];
		var numyears = Math.floor(seconds / 31536000);
		var numdays = Math.floor((seconds % 31536000) / 86400);
		var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
		var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
		var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;

		if (numyears > 0) {
			returnValue.push(numyears + " year" + (numyears !== 1 ? 's' : ''));
		}
		if (numdays > 0) {
			returnValue.push(numdays + " day" + (numdays !== 1 ? 's' : ''));
		}
		if (numhours > 0) {
			returnValue.push(numhours + " hour" + (numhours !== 1 ? 's' : ''));
		}
		if (numminutes > 0) {
			returnValue.push(numminutes + " minute" + (numminutes !== 1 ? 's' : ''));
		}

		if (numseconds > 0) {
			returnValue.push(numseconds + " second" + (numseconds !== 1 ? 's' : ''));
		}

		return returnValue.join(', ');
	},




	startGame: function(gameName) {
		var thisGame = this._conf.games[gameName];
		this.text('Starting '+thisGame.name+': ' +thisGame.server.name+' - Max players: '+thisGame.server.maxplayers+', World size: '+thisGame.server.worldsize+', Saving interval: '+this.secondsToString(thisGame.server.saveinterval));

		var command = './'+thisGame.command;
		var attributes = [
            '-batchmode',
            '+server.identity "'+thisGame.server.name+'"',
            '-logfile '+thisGame.server.name+'.log',
            '-load',
            '+server.ip '+thisGame.ip,
            '+server.port '+thisGame.port,
            '+server.tickrate 30',
            '+server.hostname "'+thisGame.server.name+'"',
            '+server.maxplayers '+thisGame.server.maxplayers,
            '+server.worldsize '+thisGame.server.worldsize,
            '+server.saveinterval '+thisGame.server.saveinterval,
            '+rcon.ip 0.0.0.0',
            '+rcon.port '+thisGame.rcon.port,
            '+rcon.password "'+thisGame.rcon.pass+'"',
            '+rcon.web true',
            '+chat.serverlog true',
            '+net.log true',
            '+server.netlog true',
        ];

		cd(thisGame.path);
		return spawn(command, attributes);
	}
}
