const Sequelize = require('sequelize');

const Op = Sequelize.Op;

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
    }, { underscored: true });
    LobbyPlayer.associate = (models) => {
        LobbyPlayer.belongsTo(models.Lobby);
        LobbyPlayer.belongsTo(models.User);

        LobbyPlayer.addScope('ready', {
            where: {
                ready: true,
            },
        });

        LobbyPlayer.addScope('not_ready', {
            where: {
                ready: false,
            },
        });

        LobbyPlayer.addScope('no_team', {
            where: {
                faction: 0,
            },
        });

        LobbyPlayer.addScope('team_1', {
            where: {
                faction: 1,
            },
        });

        LobbyPlayer.addScope('team_2', {
            where: {
                faction: 2,
            },
        });

        LobbyPlayer.addScope('lobby_name', value => ({
            include: [{
                model: models.Lobby,
                where: {
                    lobby_name: value,
                },
            }],
        }));

        LobbyPlayer.addScope('guild_id', value => ({
            include: [{
                model: models.Lobby,
                include: [{
                    model: models.League,
                    where: {
                        guild_id: value,
                    },
                }],
            }],
        }));

        LobbyPlayer.addScope('steamid_64', value => ({
            include: [{
                model: models.User,
                where: {
                    steamid_64: value,
                },
            }],
        }));

        LobbyPlayer.addScope('discord_id', value => ({
            include: [{
                model: models.User,
                where: {
                    discord_id: value,
                },
            }],
        }));

        /* LobbyPlayer.addScope('steamid_64s', values => {
            return {
                include: [{
                    model: models.User,
                    where: {
                        steamid_64: {
                            [Op.in]: values
                        }
                    }
                }]
            }
        });

        LobbyPlayer.addScope('discord_ids', values => {
            return {
                include: [{
                    model: models.User,
                    where: {
                        discord_id: {
                            [Op.in]: values
                        }
                    }
                }]
            }
        });

        LobbyPlayer.addScope('users', values => {
            return {
                include: [{
                    model: models.User,
                    where: {
                        id: {
                            [Op.in]: values.map(user => user.id)
                        }
                    }
                }]
            }
        }); */
    };
    return LobbyPlayer;
};
