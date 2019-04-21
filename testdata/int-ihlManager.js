const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: 'League',
        data: {
            id: 1,
            guildId: '422549177151782925',
            readyCheckTimeout: 5000,
            captainRankThreshold: 3,
            currentSeasonId: 1,
            categoryName: 'inhouses',
            channelName: 'general',
            adminRoleName: 'Inhouse Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'User',
        data: {
            id: 1,
            leagueId: 1,
            steamId64: '76561198015512690',
            discordId: '76864899866697728',
            nickname: 'Test',
            role1: -1,
            role2: -1,
            role3: -1,
            role4: -1,
            role5: -1,
            queueTimeout: null,
            vouched: true,
            rankTier: 63,
            gameModePreference: CONSTANTS.DOTA_GAMEMODE_CD,
            commends: 0,
            reputation: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
];
