const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Bots', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        steamId64: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        accountName: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        personaName: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        password: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        status: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.BOT_OFFLINE,
        },
        lobbyCount: {
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
    }),
    down: queryInterface => queryInterface.dropTable('Bots'),
};
