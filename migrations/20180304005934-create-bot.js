const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Bots', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        steamid_64: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        account_name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        persona_name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        password: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        status: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.BOT_OFFLINE,
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
    .then(() => queryInterface.addIndex('Bots', ['league_id']))
    .then(() => queryInterface.addConstraint('Bots', ['league_id', 'steamid_64'], {
        type: 'unique',
        name: 'uq_bots_league_id_steamid_64',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Bots'),
};
