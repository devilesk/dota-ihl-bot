/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Lobbies', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        leagueId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        seasonId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Seasons',
                key: 'id',
            },
        },
        botId: {
            type: Sequelize.INTEGER,
            onDelete: 'SET NULL',
            references: {
                model: 'Bots',
                key: 'id',
            },
        },
        queueType: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        lobbyName: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        channelId: {
            type: Sequelize.STRING,
        },
        roleId: {
            type: Sequelize.STRING,
        },
        dotaLobbyId: {
            type: Sequelize.STRING,
        },
        password: {
            type: Sequelize.STRING,
        },
        readyCheckTime: Sequelize.DATE,
        state: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.STATE_NEW,
        },
        gameMode: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        matchId: {
            type: Sequelize.STRING,
        },
        selectionPriority: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        playerFirstPick: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        firstPick: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        radiantFaction: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        winner: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        failReason: {
            type: Sequelize.STRING,
        },
        captain1UserId: {
            type: Sequelize.INTEGER,
            onDelete: 'SET NULL',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        captain2UserId: {
            type: Sequelize.INTEGER,
            onDelete: 'SET NULL',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        startedAt: {
            type: Sequelize.DATE,
        },
        finishedAt: {
            type: Sequelize.DATE,
        },
        valveData: {
            type: Sequelize.JSONB,
        },
        odotaData: {
            type: Sequelize.JSONB,
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
        .then(() => queryInterface.addIndex('Lobbies', ['leagueId']))
        .then(() => queryInterface.addIndex('Lobbies', ['seasonId']))
        .then(() => queryInterface.addConstraint('Lobbies', ['seasonId', 'lobbyName'], {
            type: 'unique',
            name: 'uq_lobbies_seasonId_lobbyName',
        })),
    down: queryInterface => queryInterface.dropTable('Lobbies'),
};
