module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Tickets', [
        {
            leagueid: 123,
            name: 'Test Ticket',
            mostRecentActivity: new Date(),
            startTimestamp: new Date(),
            endTimestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Tickets', null, {}),
};
