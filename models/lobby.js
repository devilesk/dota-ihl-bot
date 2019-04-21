/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Lobby = sequelize.define('Lobby', {
        queueType: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        lobbyName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        channelId: DataTypes.STRING,
        roleId: DataTypes.STRING,
        dotaLobbyId: DataTypes.STRING,
        password: DataTypes.STRING,
        readyCheckTime: DataTypes.DATE,
        state: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.STATE_NEW,
        },
        gameMode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        matchId: DataTypes.STRING,
        selectionPriority: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        playerFirstPick: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        firstPick: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        radiantFaction: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        winner: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        failReason: DataTypes.STRING,
        startedAt: DataTypes.DATE,
        finishedAt: DataTypes.DATE,
        valveData: DataTypes.JSONB,
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
