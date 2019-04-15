const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Bot",
        data: {
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