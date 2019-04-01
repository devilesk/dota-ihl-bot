const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Bot",
        data: {
            id: 1,
            league_id: 1,
            steamid_64: '999991',
            account_name: 'bot1',
            password: 'bot1',
            persona_name: 'pass',
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
            account_name: 'bot2',
            persona_name: 'bot2',
            password: 'pass',
            status: CONSTANTS.BOT_ONLINE,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]