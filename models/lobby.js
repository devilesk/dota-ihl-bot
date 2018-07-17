const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Lobby = sequelize.define('Lobby', {
        lobby_name: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        lobby_id: DataTypes.STRING,
        password: DataTypes.STRING,
        active: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        ready_check_time: DataTypes.DATE,
        state: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.STATE_NEW,
        },
        game_mode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        match_id: DataTypes.STRING,
        captain_1: DataTypes.STRING,
        captain_2: DataTypes.STRING,
    },
    {
        underscored: true,
    });
    Lobby.associate = (models) => {
        Lobby.belongsTo(models.League);
        Lobby.belongsTo(models.Season);
        Lobby.belongsTo(models.Bot);
        Lobby.belongsToMany(models.User, { as: 'Players', through: models.LobbyPlayer });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    ready: true,
                },
            },
            as: 'readyPlayers',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    ready: false,
                },
            },
            as: 'NotReadyPlayers',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 0,
                },
            },
            as: 'NoTeamPlayers',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 1,
                },
            },
            as: 'Team1Players',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    faction: 2,
                },
            },
            as: 'Team2Players',
        });

        Lobby.addScope('lobby_name', value => ({
            where: {
                lobby_name: value,
            },
        }));

        Lobby.addScope('state', value => ({
            where: {
                state: value,
            },
        }));

        Lobby.addScope('match_id', value => ({
            where: {
                match_id: value,
            },
        }));

        Lobby.addScope('active', {
            where: {
                active: true,
            },
        });

        Lobby.addScope('inactive', {
            where: {
                active: false,
            },
        });

        Lobby.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guild_id: value,
                },
            }],
        }));
    };
    return Lobby;
};
