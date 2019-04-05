const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Bots', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        steamid_64: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        account_name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        persona_name: {
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
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    }),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Bots'),
};
