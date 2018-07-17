module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Seasons', [{
        league_id: 1,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
    },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Seasons', null, {}),
};
