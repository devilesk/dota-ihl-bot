const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Leagues', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        guild_id: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        current_season_id: {
            type: Sequelize.INTEGER,
        },
        current_ticket_id: {
            type: Sequelize.INTEGER,
        },
        ready_check_timeout: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 60000,
        },
        captain_rank_threshold: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 3,
        },
        captain_role_regexp: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'Tier ([0-9]+) Captain',
        },
        category_name: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'inhouses',
        },
        channel_name: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'general',
        },
        admin_role_name: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'Inhouse Admin',
        },
        initial_rating: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 1000,
        },
        elo_k_factor: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 20,
        },
        matchmaking_system: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'badge',
        },
        default_game_mode: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        lobby_name_template: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'Inhouse Lobby ${lobby_id}',
        },
        draft_order: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: 'ABBABAAB',
        },
        leagueid: {
            type: Sequelize.INTEGER,
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
    .then(() => queryInterface.sequelize.query('CREATE EXTENSION fuzzystrmatch;')),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Leagues'),
};
