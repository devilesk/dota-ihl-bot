const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: 'Bot',
        data: {
            steamId64: '999991',
            accountName: 'bot1',
            password: 'bot1',
            personaName: 'pass',
            status: CONSTANTS.BOT_OFFLINE,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Bot',
        data: {
            steamId64: '999992',
            accountName: 'bot2',
            personaName: 'bot2',
            password: 'pass',
            status: CONSTANTS.BOT_ONLINE,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
];
