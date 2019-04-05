const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Tickets', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        dota_league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            unique: true,
        },
        name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        most_recent_activity: {
            type: Sequelize.DATE,
        },
        start_timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        end_timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
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
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Tickets'),
};
