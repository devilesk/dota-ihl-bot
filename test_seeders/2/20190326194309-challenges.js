module.exports = {
    up: queryInterface => queryInterface.bulkInsert('Challenges', [{
        recipientUserId: 1,
        giverUserId: 12,
        accepted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },

    ], {}),

    down: queryInterface => queryInterface.bulkDelete('Challenges', null, {}),
};
