module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('LeagueBots', {
        league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        bot_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Bots',
                key: 'id',
            },
        },
        ticketed: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
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
    .then(() => queryInterface.addIndex('LeagueBots', ['league_id']))
    .then(() => queryInterface.addIndex('LeagueBots', ['bot_id']))
    .then(() => queryInterface.addConstraint('LeagueBots', ['league_id', 'bot_id'], {
        type: 'primary key',
        name: 'pk_leaguebots_league_id_bot_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('LeagueBots'),
};
