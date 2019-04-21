const CONSTANTS = require('../lib/constants');

module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Lobbies', [{
        leagueId: 1,
        seasonId: 1,
        queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
        lobbyName: 'funny-yak-74',
        password: 'rd2l',
        state: CONSTANTS.STATE_NEW,
        captain1UserId: 1,
        captain2UserId: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Lobbies', null, {}),
};
