/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Leagues', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        guildId: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        currentSeasonId: {
            type: Sequelize.INTEGER,
        },
        readyCheckTimeout: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 60000,
        },
        captainRankThreshold: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 3,
        },
        captainRoleRegexp: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'Tier ([0-9]+) Captain',
        },
        categoryName: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'inhouses',
        },
        channelName: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'general',
        },
        adminRoleName: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'Inhouse Admin',
        },
        initialRating: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 1000,
        },
        eloKFactor: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 20,
        },
        matchmakingSystem: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'badge',
        },
        defaultGameMode: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        lobbyNameTemplate: {
            allowNull: false,
            type: Sequelize.STRING,
            // eslint-disable-next-line no-template-curly-in-string
            defaultValue: 'Inhouse Lobby ${lobbyId}',
        },
        draftOrder: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'ABBABAAB',
        },
        leagueid: {
            type: Sequelize.INTEGER,
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
        .then(() => queryInterface.sequelize.query('CREATE EXTENSION fuzzystrmatch;')),
    down: queryInterface => queryInterface.dropTable('Leagues'),
};
