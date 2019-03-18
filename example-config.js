module.exports = {
  steam: {
    path: '~/Steam'
  },
  games: [
    {
      game: 'rust',
      path: '~/rust_server',
      host: 'localhost',
      ip: '127.0.0.1',
      port: 28015,
      rcon: {
        port: 28016,
        pass: 'rcon-password'
      },
      server: {
        name: 'Name of the server',
        maxplayers: 25,
        worldsize: 4000,
        saveinterval: 15 // minutes
      }
    }
  ]
};
