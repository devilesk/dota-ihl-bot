/* eslint-disable object-curly-newline */
module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Seasons', {
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
        name: {
            type: Sequelize.STRING,
        },
        active: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: true,
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
        .then(() => queryInterface.addIndex('Seasons', ['leagueId'])),
    down: queryInterface => queryInterface.dropTable('Seasons'),
};
