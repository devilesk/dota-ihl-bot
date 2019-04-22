/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class User
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        steamId64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        discordId: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        nickname: DataTypes.STRING,
        role1: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role2: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role3: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role4: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        role5: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        queueTimeout: {
            type: DataTypes.DATE,
        },
        vouched: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        rating: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 1000,
        },
        rankTier: DataTypes.INTEGER,
        gameModePreference: {
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
    });
    User.associate = (models) => {
        User.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });
        User.hasMany(models.Leaderboard, {
            foreignKey: 'userId',
        });

        User.hasMany(models.Challenge, {
            as: 'ChallengesReceived',
            foreignKey: 'recipientUserId',
        });

        User.hasMany(models.Challenge, {
            as: 'ChallengesGiven',
            foreignKey: 'giverUserId',
        });

        User.hasMany(models.Commend, {
            as: 'CommendsReceived',
            foreignKey: 'recipientUserId',
        });

        User.hasMany(models.Commend, {
            as: 'CommendsGiven',
            foreignKey: 'giverUserId',
        });

        User.hasMany(models.Reputation, {
            as: 'ReputationsReceived',
            foreignKey: 'recipientUserId',
        });

        User.hasMany(models.Reputation, {
            as: 'ReputationsGiven',
            foreignKey: 'giverUserId',
        });

        User.belongsToMany(models.Lobby, { as: 'Lobbies', through: models.LobbyPlayer, foreignKey: 'userId', otherKey: 'lobbyId' });

        User.belongsToMany(models.Lobby, { as: 'Queues', through: models.LobbyQueuer, foreignKey: 'userId', otherKey: 'lobbyId' });

        User.belongsToMany(models.Lobby, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: true,
                },
            },
            as: 'ActiveQueues',
            foreignKey: 'userId',
            otherKey: 'lobbyId',
        });

        User.belongsToMany(models.Lobby, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: false,
                },
            },
            as: 'InactiveQueues',
            foreignKey: 'userId',
            otherKey: 'lobbyId',
        });

        User.addScope('steamId64', value => ({
            where: {
                steamId64: value,
            },
        }));

        User.addScope('discordId', value => ({
            where: {
                discordId: value,
            },
        }));

        User.addScope('nickname', value => ({
            where: {
                nickname: value,
            },
        }));

        User.addScope('id', value => ({
            where: {
                id: value,
            },
        }));

        User.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guildId: value,
                },
            }],
        }));
    };
    return User;
};
