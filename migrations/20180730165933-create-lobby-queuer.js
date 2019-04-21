module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LobbyQueuers', {
        lobbyId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Lobbies',
                key: 'id',
            },
        },
        userId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        active: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: true,
        },
        timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
        .then(() => queryInterface.addIndex('LobbyQueuers', ['lobbyId']))
        .then(() => queryInterface.addIndex('LobbyQueuers', ['userId']))
        .then(() => queryInterface.addConstraint('LobbyQueuers', ['lobbyId', 'userId'], {
            type: 'primary key',
            name: 'pk_lobbyqueuers_lobbyId_userId',
        })),
    down: queryInterface => queryInterface.dropTable('LobbyQueuers'),
};
