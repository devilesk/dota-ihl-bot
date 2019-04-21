const CONSTANTS = require('../../lib/constants');

module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Lobbies', [{
        leagueId: 1,
        seasonId: 1,
        queueType: CONSTANTS.QUEUE_TYPE_AUTO,
        lobbyName: 'funny-yak-74',
        password: 'rd2l',
        state: CONSTANTS.STATE_MATCH_IN_PROGRESS,
        matchId: '4578557761',
        captain1UserId: 6,
        captain2UserId: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Lobbies', null, {}),
};
