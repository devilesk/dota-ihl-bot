const CONSTANTS = require('../../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Lobbies', [{
        league_id: 1,
        season_id: 1,
        queue_type: CONSTANTS.QUEUE_TYPE_AUTO,
        lobby_name: 'funny-yak-74',
        password: 'rd2l',
        state: CONSTANTS.STATE_MATCH_IN_PROGRESS,
        match_id: '4578557761',
        captain_1_user_id: 6,
        captain_2_user_id: 7,
        created_at: new Date(),
        updated_at: new Date(),
    },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Lobbies', null, {}),
};
