module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Tickets', [
        {
            leagueid: 123,
            name: "Test Ticket",
            most_recent_activity: new Date(),
            start_timestamp: new Date(),
            end_timestamp: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Tickets', null, {}),
};
