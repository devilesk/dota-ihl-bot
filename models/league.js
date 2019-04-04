const CONSTANTS = require('../lib/constants');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const League = sequelize.define('League', {
        guild_id: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        current_season_id: {
            type: DataTypes.INTEGER,
        },
        ready_check_timeout: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 60000,
        },
        captain_rank_threshold: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
        captain_role_regexp: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Tier ([0-9]+) Captain',
        },
        category_name: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'inhouses',
        },
        channel_name: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'general',
        },
        admin_role_name: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Inhouse Admin',
        },
        initial_rating: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 1000,
        },
        elo_k_factor: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 20,
        },
        default_game_mode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        lobby_name_template: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Inhouse Lobby ${lobby_id}',
        },
        draft_order: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'ABBABAAB',
        },
        leagueid: {
            type: DataTypes.INTEGER,
        },
    },
    {
        underscored: true,
        scopes: {
            guild: value => ({
                where: {
                    guild_id: value,
                },
            }),
        },
    });
    League.associate = (models) => {
        League.hasMany(models.Season);
        League.hasMany(models.Queue);
        League.hasMany(models.User);
        League.hasMany(models.Lobby);
        League.hasMany(models.Bot);
        League.hasMany(models.Leaderboard);
    };
    return League;
};
