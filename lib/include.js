module.exports = {
	steam: {
		command: 'steamcmd.sh',
	},
	games: {
		rust: {
			name: 'Rust Server',
			appId: 258550,
			command: 'RustDedicated',
			bashrc: thisGame => `export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:${thisGame.path}/RustDedicated_Data/Plugins/x86_64"`
		},
	}
}
