/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Users', {
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
        steamId64: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        discordId: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        nickname: {
            type: Sequelize.STRING,
        },
        role1: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role2: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role3: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role4: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role5: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        queueTimeout: {
            type: Sequelize.DATE,
        },
        vouched: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        rating: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 1000,
        },
        rankTier: {
            type: Sequelize.INTEGER,
        },
        gameModePreference: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        commends: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        reputation: {
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
        .then(() => queryInterface.addIndex('Users', ['leagueId']))
        .then(() => queryInterface.addConstraint('Users', ['leagueId', 'steamId64'], {
            type: 'unique',
            name: 'uq_users_leagueId_steamId64',
        }))
        .then(() => queryInterface.addConstraint('Users', ['leagueId', 'discordId'], {
            type: 'unique',
            name: 'uq_users_leagueId_discordId',
        })),
    down: queryInterface => queryInterface.dropTable('Users'),
};
