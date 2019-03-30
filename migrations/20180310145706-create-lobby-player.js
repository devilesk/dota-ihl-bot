module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LobbyPlayers', {
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
        faction: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        win: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        lose: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        hero_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        kills: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        deaths: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        assists: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        gpm: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        xpm: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
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
    .then(() => queryInterface.addIndex('LobbyPlayers', ['lobby_id']))
    .then(() => queryInterface.addIndex('LobbyPlayers', ['user_id']))
    .then(() => queryInterface.addConstraint('LobbyPlayers', ['lobby_id', 'user_id'], {
        type: 'primary key',
        name: 'pk_lobbyplayers_lobby_id_user_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('LobbyPlayers'),
};
