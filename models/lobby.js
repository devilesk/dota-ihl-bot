const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Lobby = sequelize.define('Lobby', {
        queue_type: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        lobby_name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        channel_id: DataTypes.STRING,
        role_id: DataTypes.STRING,
        lobby_id: DataTypes.STRING,
        password: DataTypes.STRING,
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
        fail_reason: DataTypes.STRING,
        started_at: DataTypes.DATE,
        finished_at: DataTypes.DATE,
        valve_data: DataTypes.JSONB,
        odota_data: DataTypes.JSONB,
    },
    {
        underscored: true,
    });
    Lobby.associate = (models) => {
        Lobby.belongsTo(models.League);
        Lobby.belongsTo(models.Season);
        Lobby.belongsTo(models.Bot);
        Lobby.belongsToMany(models.User, { as: 'Players', through: models.LobbyPlayer });
        Lobby.belongsToMany(models.User, { as: 'Queuers', through: models.LobbyQueuer });

        Lobby.belongsTo(models.User, {
            as: 'Captain1',
            foreignKey: 'captain_1_user_id',
        });

        Lobby.belongsTo(models.User, {
            as: 'Captain2',
            foreignKey: 'captain_2_user_id',
        });
        
        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyPlayer,
                scope: {
                    ready: true,
                },
            },
            as: 'ReadyPlayers',
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
        
        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: true,
                },
            },
            as: 'ActiveQueuers',
        });

        Lobby.belongsToMany(models.User, {
            through: {
                model: models.LobbyQueuer,
                scope: {
                    active: false,
                },
            },
            as: 'InactiveQueuers',
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
