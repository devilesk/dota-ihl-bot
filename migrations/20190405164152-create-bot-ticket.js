module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('BotTickets', {
        bot_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Bots',
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
    .then(() => queryInterface.addIndex('BotTickets', ['bot_id']))
    .then(() => queryInterface.addIndex('BotTickets', ['ticket_id']))
    .then(() => queryInterface.addConstraint('BotTickets', ['bot_id', 'ticket_id'], {
        type: 'primary key',
        name: 'pk_bottickets_bot_id_ticket_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('BotTickets'),
};
