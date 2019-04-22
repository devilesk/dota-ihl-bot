/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class League
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const League = sequelize.define('League', {
        /**
         * @memberof module:db.League
         * @instance
         */
        guildId: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        currentSeasonId: {
            type: DataTypes.INTEGER,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        readyCheckTimeout: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 60000,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        captainRankThreshold: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        captainRoleRegexp: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Tier ([0-9]+) Captain',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        categoryName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'inhouses',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        channelName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'general',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        adminRoleName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Inhouse Admin',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        initialRating: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 1000,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        eloKFactor: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 20,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        defaultGameMode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        lobbyNameTemplate: {
            allowNull: false,
            type: DataTypes.STRING,
            // eslint-disable-next-line no-template-curly-in-string
            defaultValue: 'Inhouse Lobby ${lobbyId}',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        draftOrder: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'ABBABAAB',
        },
        /**
         * @memberof module:db.League
         * @instance
         */
        leagueid: {
            type: DataTypes.INTEGER,
        },
    },
    {
        scopes: {
            guild: value => ({
                where: {
                    guildId: value,
                },
            }),
        },
    });
    League.associate = (models) => {
        League.hasMany(models.Season, {
            foreignKey: 'leagueId',
        });
        League.hasMany(models.Queue, {
            foreignKey: 'leagueId',
        });
        League.hasMany(models.User, {
            foreignKey: 'leagueId',
        });
        League.hasMany(models.Lobby, {
            foreignKey: 'leagueId',
        });
        League.hasMany(models.Leaderboard, {
            foreignKey: 'leagueId',
        });
        League.belongsToMany(models.Ticket, { through: models.LeagueTicket, foreignKey: 'leagueId', otherKey: 'ticketId' });
        League.belongsTo(models.Season, {
            as: 'CurrentSeason',
            foreignKey: 'currentSeasonId',
            constraints: false,
        });
        League.belongsTo(models.Ticket, {
            as: 'CurrentTicket',
            foreignKey: 'leagueid',
            targetKey: 'leagueid',
            constraints: false,
        });
    };
    return League;
};
