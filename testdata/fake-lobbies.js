const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Lobby",
        data: {
            league_id: 1,
            season_id: 1,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'funny-yak-74',
            bot_id: 1,
            password: 'rd2l',
            state: CONSTANTS.STATE_NEW,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Lobby",
        data: {
            league_id: 1,
            season_id: 1,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'funny-yak-75',
            password: 'rd2l',
            state: CONSTANTS.STATE_MATCH_ENDED,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            match_id: '123',
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Lobby",
        data: {
            league_id: 1,
            season_id: 1,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'funny-yak-76',
            password: 'rd2l',
            state: CONSTANTS.STATE_KILLED,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Lobby",
        data: {
            league_id: 2,
            season_id: 2,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'funny-yak-77',
            password: 'rd2l',
            state: CONSTANTS.STATE_NEW,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Lobby",
        data: {
            league_id: 2,
            season_id: 2,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'test123-test456-2',
            password: 'rd2l',
            state: CONSTANTS.STATE_MATCH_IN_PROGRESS,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Lobby",
        data: {
            league_id: 1,
            season_id: 1,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobby_name: 'funny-1',
            password: 'rd2l',
            state: CONSTANTS.STATE_WAITING_FOR_QUEUE,
            captain_1_user_id: 1,
            captain_2_user_id: 4,
            match_id: '123',
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]