const CONSTANTS = require('../lib/constants');

module.exports = [
    {
        model: "Reputation",
        data: {
            league_id: 1,
            recipient_user_id: 1,
            giver_user_id: 3,
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Reputation",
        data: {
            league_id: 1,
            recipient_user_id: 3,
            giver_user_id: 5,
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
    {
        model: "Reputation",
        data: {
            league_id: 2,
            recipient_user_id: 3,
            giver_user_id: 5,
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        }
    },
]