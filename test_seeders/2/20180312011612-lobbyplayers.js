module.exports = {
    up: queryInterface => queryInterface.bulkInsert('LobbyPlayers', [{
        lobbyId: 1,
        userId: 1,
        ready: true,
        faction: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 2,
        ready: true,
        faction: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 3,
        ready: true,
        faction: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 4,
        ready: true,
        faction: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 5,
        ready: true,
        faction: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 6,
        ready: true,
        faction: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 7,
        ready: true,
        faction: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 8,
        ready: true,
        faction: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 10,
        ready: true,
        faction: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        lobbyId: 1,
        userId: 11,
        ready: true,
        faction: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
    },

    ], {}),

    down: queryInterface => queryInterface.bulkDelete('LobbyPlayers', null, {}),
};
