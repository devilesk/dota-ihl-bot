const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Tickets', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        leagueid: {
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
            type: Sequelize.DATE,
        },
        end_timestamp: {
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
    })
    .then(() => queryInterface.addIndex('Tickets', ['leagueid'])),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Tickets'),
};
