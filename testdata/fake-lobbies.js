const CONSTANTS = require('../lib/constants');

module.exports = {
    model: "Lobby",
    data: {
        id: 1,
        league_id: 1,
        season_id: 1,
        lobby_name: 'funny-yak-74',
        password: 'rd2l',
        state: CONSTANTS.STATE_NEW,
        captain_1_user_id: 1,
        captain_2_user_id: 4,
        created_at: new Date(),
        updated_at: new Date(),
    }
}