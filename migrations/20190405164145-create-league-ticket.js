module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LeagueTickets', {
        league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        ticket_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Tickets',
                key: 'id',
            },
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
    .then(() => queryInterface.addIndex('LeagueTickets', ['league_id']))
    .then(() => queryInterface.addIndex('LeagueTickets', ['ticket_id']))
    .then(() => queryInterface.addConstraint('LeagueTickets', ['league_id', 'ticket_id'], {
        type: 'primary key',
        name: 'pk_leaguetickets_league_id_ticket_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('LeagueTickets'),
};
