const CONSTANTS = require('../lib/constants');

module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Queues', [
        {
            leagueId: 1,
            enabled: true,
            queueType: CONSTANTS.QUEUE_TYPE_DRAFT,
            queueName: 'player-draft-queue',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            leagueId: 1,
            enabled: true,
            queueType: CONSTANTS.QUEUE_TYPE_AUTO,
            queueName: 'autobalanced-queue',
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Queues', null, {}),
};
