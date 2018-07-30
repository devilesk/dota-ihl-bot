const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        steamid_64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        discord_id: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        nickname: DataTypes.STRING,
        role_1: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role_2: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role_3: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role_4: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role_5: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        queue_timeout: {
            type: DataTypes.DATE,
        },
        vouched: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        rank_tier: DataTypes.INTEGER,
        game_mode_preference: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        commends: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        reputation: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    }, { underscored: true });
    User.associate = (models) => {
        User.belongsTo(models.League);
        User.hasMany(models.Leaderboard);

        User.hasMany(models.Challenge, {
            as: 'ChallengesReceived',
            foreignKey: 'recipient_user_id',
        });

        User.hasMany(models.Challenge, {
            as: 'ChallengesGiven',
            foreignKey: 'giver_user_id',
        });

        User.hasMany(models.Commend, {
            as: 'CommendsReceived',
            foreignKey: 'recipient_user_id',
        });

        User.hasMany(models.Commend, {
            as: 'CommendsGiven',
            foreignKey: 'giver_user_id',
        });

        User.hasMany(models.Reputation, {
            as: 'ReputationsReceived',
            foreignKey: 'recipient_user_id',
        });

        User.hasMany(models.Reputation, {
            as: 'ReputationsGiven',
            foreignKey: 'giver_user_id',
        });

        User.belongsToMany(models.Lobby, { through: models.LobbyPlayer });

        User.addScope('steamid_64', value => ({
            where: {
                steamid_64: value,
            },
        }));

        User.addScope('discord_id', value => ({
            where: {
                discord_id: value,
            },
        }));

        User.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guild_id: value,
                },
            }],
        }));
    };
    return User;
};
