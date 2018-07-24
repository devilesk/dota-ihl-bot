const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Lobbies', {
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
        season_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Seasons',
                key: 'id',
            },
        },
        bot_id: {
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Bots',
                key: 'id',
            },
        },
        lobby_name: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        lobby_id: {
            type: Sequelize.STRING,
        },
        password: {
            type: Sequelize.STRING,
        },
        ready_check_time: Sequelize.DATE,
        state: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.STATE_NEW,
        },
        game_mode: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        match_id: {
            type: Sequelize.STRING,
        },
        captain_1: {
            type: Sequelize.STRING,
        },
        captain_2: {
            type: Sequelize.STRING,
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    }),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Lobbies'),
};
