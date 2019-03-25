const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Lobbies', [{
        league_id: 1,
        season_id: 1,
        queue_type: CONSTANTS.QUEUE_TYPE_AUTO,
        lobby_name: 'autobalanced-queue',
        password: 'rd2l',
        state: CONSTANTS.STATE_NEW,
        captain_1_user_id: 1,
        captain_2_user_id: 4,
        created_at: new Date(),
        updated_at: new Date(),
    },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Lobbies', null, {}),
};
