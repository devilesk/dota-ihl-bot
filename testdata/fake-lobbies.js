const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: 'Lobby',
        data: {
            leagueId: 1,
            seasonId: 1,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'funny-yak-74',
            botId: 1,
            password: 'rd2l',
            state: CONSTANTS.STATE_NEW,
            captain1UserId: 1,
            captain2UserId: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Lobby',
        data: {
            leagueId: 1,
            seasonId: 1,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'funny-yak-75',
            password: 'rd2l',
            state: CONSTANTS.STATE_MATCH_ENDED,
            captain1UserId: 1,
            captain2UserId: 4,
            matchId: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Lobby',
        data: {
            leagueId: 1,
            seasonId: 1,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'funny-yak-76',
            password: 'rd2l',
            state: CONSTANTS.STATE_KILLED,
            captain1UserId: 1,
            captain2UserId: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Lobby',
        data: {
            leagueId: 2,
            seasonId: 2,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'funny-yak-77',
            password: 'rd2l',
            state: CONSTANTS.STATE_NEW,
            captain1UserId: 1,
            captain2UserId: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Lobby',
        data: {
            leagueId: 2,
            seasonId: 2,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'test123-test456-2',
            password: 'rd2l',
            state: CONSTANTS.STATE_MATCH_IN_PROGRESS,
            captain1UserId: 1,
            captain2UserId: 4,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Lobby',
        data: {
            leagueId: 1,
            seasonId: 1,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            lobbyName: 'funny-1',
            password: 'rd2l',
            state: CONSTANTS.STATE_WAITING_FOR_QUEUE,
            captain1UserId: 1,
            captain2UserId: 4,
            matchId: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
];
