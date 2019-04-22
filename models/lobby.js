/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class Lobby
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Lobby = sequelize.define('Lobby', {
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        queueType: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        lobbyName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        channelId: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        roleId: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        dotaLobbyId: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        password: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        readyCheckTime: DataTypes.DATE,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        state: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.STATE_NEW,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        gameMode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        matchId: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        selectionPriority: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        playerFirstPick: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        firstPick: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        radiantFaction: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        winner: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        failReason: DataTypes.STRING,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        startedAt: DataTypes.DATE,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        finishedAt: DataTypes.DATE,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        valveData: DataTypes.JSONB,
        /**
         * @memberof module:db.Lobby
         * @instance
         */
        odotaData: DataTypes.JSONB,
    });
    Lobby.associate = (models) => {
        Lobby.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });
        Lobby.belongsTo(models.Season, {
            foreignKey: 'seasonId',
        });
        Lobby.belongsTo(models.Bot, {
            foreignKey: 'botId',
            constraints: false,
        });
        Lobby.belongsToMany(models.User, { as: 'Players', through: models.LobbyPlayer, foreignKey: 'lobbyId', otherKey: 'userId' });
        Lobby.belongsToMany(models.User, { as: 'Queuers', through: models.LobbyQueuer, foreignKey: 'lobbyId', otherKey: 'userId' });

        Lobby.belongsTo(models.User, {
            as: 'Captain1',
            foreignKey: 'captain1UserId',
            constraints: false,
        });

        Lobby.belongsTo(models.User, {
            as: 'Captain2',
            foreignKey: 'captain2UserId',
            constraints: false,
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    ready: true,
                },
            },
            as: 'ReadyPlayers',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    ready: false,
                },
            },
            as: 'NotReadyPlayers',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 0,
                },
            },
            as: 'NoFactionPlayers',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 1,
                },
            },
            as: 'Faction1Players',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 2,
                },
            },
            as: 'Faction2Players',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: true,
                },
            },
            as: 'ActiveQueuers',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: false,
                },
            },
            as: 'InactiveQueuers',
            foreignKey: 'lobbyId',
            otherKey: 'userId',
        });

        Lobby.addScope('lobbyName', value => ({
            where: {
                lobbyName: value,
            },
        }));

        Lobby.addScope('state', value => ({
            where: {
                state: value,
            },
        }));

        Lobby.addScope('matchId', value => ({
            where: {
                matchId: value,
            },
        }));

        Lobby.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guildId: value,
                },
            }],
        }));
    };
    return Lobby;
};
