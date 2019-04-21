module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Seasons', [{
        leagueId: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Seasons', null, {}),
};
