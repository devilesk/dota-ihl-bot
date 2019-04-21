/* eslint-disable object-curly-newline */
module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Leaderboards', {
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
        userId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        rating: {
            type: Sequelize.INTEGER,
        },
        wins: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        losses: {
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
        .then(() => queryInterface.addIndex('Leaderboards', ['leagueId']))
        .then(() => queryInterface.addIndex('Leaderboards', ['seasonId']))
        .then(() => queryInterface.addIndex('Leaderboards', ['userId']))
        .then(() => queryInterface.addConstraint('Leaderboards', ['leagueId', 'seasonId', 'userId'], {
            type: 'unique',
            name: 'uq_leaderboards_leagueId_seasonId_userId',
        })),
    down: queryInterface => queryInterface.dropTable('Leaderboards'),
};
