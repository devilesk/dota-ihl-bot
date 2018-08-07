const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Challenge",
        data: {
            id: 1,
            recipient_user_id: 1,
            giver_user_id: 2,
            accepted: false,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Challenge",
        data: {
            id: 2,
            recipient_user_id: 2,
            giver_user_id: 3,
            accepted: false,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Challenge",
        data: {
            id: 3,
            recipient_user_id: 3,
            giver_user_id: 4,
            accepted: true,
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]