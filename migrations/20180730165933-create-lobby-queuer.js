module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LobbyQueuers', {
        lobby_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Lobbies',
                key: 'id',
            },
        },
        user_id: {
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
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
    .then(() => queryInterface.addIndex('LobbyQueuers', ['lobby_id']))
    .then(() => queryInterface.addIndex('LobbyQueuers', ['user_id']))
    .then(() => queryInterface.addConstraint('LobbyQueuers', ['lobby_id', 'user_id'], {
        type: 'primary key',
        name: 'pk_lobbyqueuers_lobby_id_user_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('LobbyQueuers'),
};
