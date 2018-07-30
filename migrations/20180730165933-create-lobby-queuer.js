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
        ready: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        state: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.QUEUE_IN_QUEUE,
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
        .then(() => queryInterface.addConstraint('LobbyQueuers', ['lobby_id', 'user_id'], {
            type: 'primary key',
            name: 'pk_lobbyqueuers_lobby_id_user_id',
        })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('LobbyQueuers'),
};
