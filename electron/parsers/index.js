const { GAMES } = require('../config')

function getParser(game) {
  if (game === 'genshin') {
    return require('./genshin')
  }
  return require('./zzz')
}

module.exports = { getParser }
