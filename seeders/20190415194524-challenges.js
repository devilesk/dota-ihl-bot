module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Challenges', [
        {
            recipient_user_id: 4,
            giver_user_id: 1,
            accepted: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Challenges', null, {}),
};
