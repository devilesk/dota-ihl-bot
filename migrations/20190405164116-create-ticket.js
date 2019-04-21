/* eslint-disable object-curly-newline */
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
        mostRecentActivity: {
            type: Sequelize.DATE,
        },
        startTimestamp: {
            type: Sequelize.DATE,
        },
        endTimestamp: {
            type: Sequelize.DATE,
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
        .then(() => queryInterface.addIndex('Tickets', ['leagueid'])),
    down: queryInterface => queryInterface.dropTable('Tickets'),
};
