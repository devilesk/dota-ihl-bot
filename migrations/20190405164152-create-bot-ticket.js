module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('BotTickets', {
        botId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Bots',
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
        .then(() => queryInterface.addIndex('BotTickets', ['botId']))
        .then(() => queryInterface.addIndex('BotTickets', ['ticketId']))
        .then(() => queryInterface.addConstraint('BotTickets', ['botId', 'ticketId'], {
            type: 'primary key',
            name: 'pk_bottickets_botId_ticketId',
        })),
    down: queryInterface => queryInterface.dropTable('BotTickets'),
};
