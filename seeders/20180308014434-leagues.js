module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Leagues', [{
        guildId: '422549177151782925',
        readyCheckTimeout: 5000,
        captainRankThreshold: 3,
        currentSeasonId: 1,
        categoryName: 'inhouses',
        channelName: 'general',
        adminRoleName: 'Inhouse Admin',
        createdAt: new Date(),
        updatedAt: new Date(),
    }], {}),

    down: queryInterface => queryInterface.bulkDelete('Leagues', null, {}),
};
