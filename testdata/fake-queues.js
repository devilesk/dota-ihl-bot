const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Queue",
        data: {
            id: 1,
            league_id: 1,
            enabled: true,
            queue_type: CONSTANTS.QUEUE_TYPE_DRAFT,
            queue_name: 'player-draft-queue',
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Queue",
        data: {
            id: 2,
            league_id: 1,
            enabled: true,
            queue_type: CONSTANTS.QUEUE_TYPE_AUTO,
            queue_name: 'autobalanced-queue',
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Queue",
        data: {
            id: 3,
            league_id: 1,
            enabled: false,
            queue_type: CONSTANTS.QUEUE_TYPE_CHALLENGE,
            queue_name: 'challenge',
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]