module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Bots', [{
        leagueId: 1,
        steamId64: '76561198810968998',
        accountName: 'test1',
        personaName: 'test1',
        password: 'pass',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        leagueId: 1,
        steamId64: '76561198811445687',
        accountName: 'test2',
        personaName: 'test2',
        password: 'pass',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Bots', null, {}),
};
