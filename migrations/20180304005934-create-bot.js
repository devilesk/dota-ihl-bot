const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Bots', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        steamid_64: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        steam_name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        steam_user: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        steam_pass: {
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
    })
    .then(() => queryInterface.addIndex('Bots', ['league_id'])),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Bots'),
};
