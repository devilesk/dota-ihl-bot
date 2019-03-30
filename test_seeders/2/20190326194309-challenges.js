module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Challenges', [{
        recipient_user_id: 1,
        giver_user_id: 12,
        accepted: false,
        created_at: new Date(),
        updated_at: new Date(),
    },

    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Challenges', null, {}),
};
