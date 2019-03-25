const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Queues', [
        {
            league_id: 1,
            enabled: true,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            queue_name: 'player-draft-queue',
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            league_id: 1,
            enabled: true,
            queue_type: CONSTANTS.QUEUE_TYPE_AUTO,
            queue_name: 'autobalanced-queue',
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Queues', null, {}),
};
