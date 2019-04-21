module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Challenges', [
        {
            recipientUserId: 4,
            giverUserId: 1,
            accepted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Challenges', null, {}),
};
