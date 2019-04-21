module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LeagueTickets', {
        leagueId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        ticketId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Tickets',
                key: 'id',
            },
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
        .then(() => queryInterface.addIndex('LeagueTickets', ['leagueId']))
        .then(() => queryInterface.addIndex('LeagueTickets', ['ticketId']))
        .then(() => queryInterface.addConstraint('LeagueTickets', ['leagueId', 'ticketId'], {
            type: 'primary key',
            name: 'pk_leaguetickets_leagueId_ticketId',
        })),
    down: queryInterface => queryInterface.dropTable('LeagueTickets'),
};
