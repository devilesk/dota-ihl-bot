const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: 'Queue',
        data: {
            leagueId: 1,
            enabled: true,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            queueName: 'player-draft-queue',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Queue',
        data: {
            leagueId: 1,
            enabled: true,
            queueType: CONSTANTS.QUEUE_TYPE_AUTO,
            queueName: 'autobalanced-queue',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Queue',
        data: {
            leagueId: 1,
            enabled: false,
            queueType: CONSTANTS.QUEUE_TYPE_CHALLENGE,
            queueName: 'challenge',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
];
