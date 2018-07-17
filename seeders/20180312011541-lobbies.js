const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Lobbies', [{
        league_id: 1,
        season_id: 1,
        lobby_name: 'funny-yak-74',
        password: 'rd2l',
        active: false,
        state: CONSTANTS.STATE_NEW,
        captain_1: '76561198015512690',
        captain_2: '76561198068904086',
        created_at: new Date(),
        updated_at: new Date(),
    },
        /* ,
            {
              league_id: 1,
              season_id: 1,
              lobby_name: 'funny-yak-75',
              password: 'rd2l',
              match_id: '3716064001',
              active: true,
              state: CONSTANTS.STATE_LOBBY_STARTED,
              game_mode: CONSTANTS.DOTA_GAMEMODE_CM,
              captain_1: '76561198077337441',
              captain_2: '76561198017839572',
              created_at: new Date(),
              updated_at: new Date()
            } */
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Lobbies', null, {}),
};
