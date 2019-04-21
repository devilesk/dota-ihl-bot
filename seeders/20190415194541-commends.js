module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Commends', [
        {
            lobbyId: 1,
            recipientUserId: 4,
            giverUserId: 1,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Commends', null, {}),
};
