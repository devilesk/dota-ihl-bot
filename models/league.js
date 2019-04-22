/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class League
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const League = sequelize.define('League', {
        guildId: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        currentSeasonId: {
            type: DataTypes.INTEGER,
        },
        readyCheckTimeout: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 60000,
        },
        captainRankThreshold: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 3,
        },
        captainRoleRegexp: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Tier ([0-9]+) Captain',
        },
        categoryName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'inhouses',
        },
        channelName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'general',
        },
        adminRoleName: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'Inhouse Admin',
        },
        initialRating: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 1000,
        },
        eloKFactor: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 20,
        },
        defaultGameMode: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        lobbyNameTemplate: {
            allowNull: false,
            type: DataTypes.STRING,
            // eslint-disable-next-line no-template-curly-in-string
            defaultValue: 'Inhouse Lobby ${lobbyId}',
        },
        draftOrder: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: 'ABBABAAB',
        },
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
