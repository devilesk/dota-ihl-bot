/* eslint-disable object-curly-newline */
module.exports = (sequelize, DataTypes) => {
    const LobbyPlayer = sequelize.define('LobbyPlayer', {
        ready: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        faction: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        win: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        lose: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        heroId: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        kills: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        deaths: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        assists: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        gpm: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        xpm: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        ratingDiff: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    });
    LobbyPlayer.associate = (models) => {
        LobbyPlayer.belongsTo(models.Lobby, {
            foreignKey: 'lobbyId',
        });
        LobbyPlayer.belongsTo(models.User, {
            foreignKey: 'userId',
        });

        LobbyPlayer.addScope('ready', {
            where: {
                ready: true,
            },
        });

        LobbyPlayer.addScope('notReady', {
            where: {
                ready: false,
            },
        });

        LobbyPlayer.addScope('noTeam', {
            where: {
                faction: 0,
            },
        });

        LobbyPlayer.addScope('team1', {
            where: {
                faction: 1,
            },
        });

        LobbyPlayer.addScope('team2', {
            where: {
                faction: 2,
            },
        });

        LobbyPlayer.addScope('lobbyName', value => ({
            include: [{
                model: models.Lobby,
                where: {
                    lobbyName: value,
                },
            }],
        }));

        LobbyPlayer.addScope('guildId', value => ({
            include: [{
                model: models.Lobby,
                include: [{
                    model: models.League,
                    where: {
                        guildId: value,
                    },
                }],
            }],
        }));

        LobbyPlayer.addScope('steamId64', value => ({
            include: [{
                model: models.User,
                where: {
                    steamId64: value,
                },
            }],
        }));

        LobbyPlayer.addScope('discordId', value => ({
            include: [{
                model: models.User,
                where: {
                    discordId: value,
                },
            }],
        }));
    };
    return LobbyPlayer;
};
