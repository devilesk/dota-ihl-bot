/* eslint-disable object-curly-newline */

/**
 * @class LobbyPlayer
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const LobbyPlayer = sequelize.define('LobbyPlayer', {
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        ready: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        faction: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        win: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        lose: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        heroId: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: -1,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        kills: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        deaths: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        assists: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        gpm: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
        xpm: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.LobbyPlayer
         * @instance
         */
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
