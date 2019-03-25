module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Bots', [{
        league_id: 1,
        steamid_64: '76561198810968998',
        steam_name: 'test1',
        steam_user: 'test1',
        steam_pass: 'pass',
        created_at: new Date(),
        updated_at: new Date(),
    },
    {
        league_id: 1,
        steamid_64: '76561198811445687',
        steam_name: 'test2',
        steam_user: 'test2',
        steam_pass: 'pass',
        created_at: new Date(),
        updated_at: new Date(),
    },
    ], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Bots', null, {}),
};
