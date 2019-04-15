module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Reputations', [
        {
            recipient_user_id: 4,
            giver_user_id: 1,
            timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Reputations', null, {}),
};
