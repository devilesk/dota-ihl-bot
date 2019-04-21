module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LobbyPlayers', {
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
        heroId: {
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
        ratingDiff: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
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
        .then(() => queryInterface.addIndex('LobbyPlayers', ['lobbyId']))
        .then(() => queryInterface.addIndex('LobbyPlayers', ['userId']))
        .then(() => queryInterface.addConstraint('LobbyPlayers', ['lobbyId', 'userId'], {
            type: 'primary key',
            name: 'pk_lobbyplayers_lobbyId_userId',
        })),
    down: queryInterface => queryInterface.dropTable('LobbyPlayers'),
};
