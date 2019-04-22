/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class User
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        /**
         * @memberof module:db.User
         * @instance
         */
        steamId64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        discordId: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        nickname: DataTypes.STRING,
        /**
         * @memberof module:db.User
         * @instance
         */
        role1: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        role2: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        role3: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        role4: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        role5: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        queueTimeout: {
            type: DataTypes.DATE,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        vouched: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        rating: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 1000,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        rankTier: DataTypes.INTEGER,
        /**
         * @memberof module:db.User
         * @instance
         */
        gameModePreference: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
        commends: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.User
         * @instance
         */
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
