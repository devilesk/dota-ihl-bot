module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Bots', [{
        league_id: 1,
        steamid_64: '76561198810968998',
        account_name: 'test1',
        persona_name: 'test1',
        password: 'pass',
        created_at: new Date(),
        updated_at: new Date(),
    },
    {
        league_id: 1,
        steamid_64: '76561198811445687',
        account_name: 'test2',
        persona_name: 'test2',
        password: 'pass',
        created_at: new Date(),
        updated_at: new Date(),
    },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Bots', null, {}),
};
