module.exports = [
    {
        model: 'Challenge',
        data: {
            recipientUserId: 1,
            giverUserId: 2,
            accepted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Challenge',
        data: {
            recipientUserId: 2,
            giverUserId: 3,
            accepted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
    {
        model: 'Challenge',
        data: {
            recipientUserId: 3,
            giverUserId: 4,
            accepted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    },
];
