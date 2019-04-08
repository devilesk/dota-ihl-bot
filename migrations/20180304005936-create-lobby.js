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
            onDelete: 'SET NULL',
            references: {
                model: 'Bots',
                key: 'id',
            },
        },
        queue_type: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        lobby_name: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        channel_id: {
            type: Sequelize.STRING,
        },
        role_id: {
            type: Sequelize.STRING,
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
        selection_priority: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        player_first_pick: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        first_pick: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        radiant_faction: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        winner: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        fail_reason: {
            type: Sequelize.STRING,
        },
        captain_1_user_id: {
            type: Sequelize.INTEGER,
            onDelete: 'SET NULL',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        captain_2_user_id: {
            type: Sequelize.INTEGER,
            onDelete: 'SET NULL',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        started_at: {
            type: Sequelize.DATE,
        },
        finished_at: {
            type: Sequelize.DATE,
        },
        valve_data: {
            type: Sequelize.JSONB,
        },
        odota_data: {
            type: Sequelize.JSONB,
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
    .then(() => queryInterface.addIndex('Lobbies', ['league_id']))
    .then(() => queryInterface.addIndex('Lobbies', ['season_id']))
    .then(() => queryInterface.addConstraint('Lobbies', ['season_id', 'lobby_name'], {
        type: 'unique',
        name: 'uq_lobbies_season_id_lobby_name',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Lobbies'),
};
