module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Commends', [
        {
            lobby_id: 1,
            recipient_user_id: 4,
            giver_user_id: 1,
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Commends', null, {}),
};
