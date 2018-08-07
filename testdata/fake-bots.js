const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Bot",
        data: {
            id: 1,
            league_id: 1,
            steamid_64: '999991',
            steam_name: 'bot1',
            steam_pass: 'bot1',
            steam_user: 'pass',
            status: CONSTANTS.BOT_OFFLINE,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Bot",
        data: {
            id: 2,
            league_id: 1,
            steamid_64: '999992',
            steam_name: 'bot2',
            steam_user: 'bot2',
            steam_pass: 'pass',
            status: CONSTANTS.BOT_ONLINE,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]