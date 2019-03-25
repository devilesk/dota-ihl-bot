const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "League",
        data: {
            id: 1,
            guild_id: '422549177151782925',
            ready_check_timeout: 5000,
            captain_rank_threshold: 3,
            current_season_id: 1,
            category_name: 'inhouses',
            channel_name: 'general',
            admin_role_name: 'Inhouse Admin',
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "User",
        data: {
            id: 1,
            league_id: 1,
            steamid_64: '76561198015512690',
            discord_id: '76864899866697728',
            nickname: 'Test',
            role_1: -1,
            role_2: -1,
            role_3: -1,
            role_4: -1,
            role_5: -1,
            queue_timeout: null,
            vouched: true,
            rank_tier: 63,
            game_mode_preference: CONSTANTS.DOTA_GAMEMODE_CD,
            commends: 0,
            reputation: 0,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
];

