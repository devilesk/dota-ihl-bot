/* eslint-disable object-curly-newline */

/**
 * @class Season
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Season = sequelize.define('Season', {
        /**
         * @memberof module:db.Season
         * @instance
         */
        name: DataTypes.STRING,
        /**
         * @memberof module:db.Active
         * @instance
         */
        active: DataTypes.BOOLEAN,
    });
    Season.associate = (models) => {
        Season.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });
        Season.hasMany(models.Lobby, {
            foreignKey: 'seasonId',
        });
        Season.hasMany(models.Leaderboard, {
            foreignKey: 'seasonId',
        });

        Season.addScope('active', {
            where: {
                active: true,
            },
        });

        Season.addScope('inactive', {
            where: {
                active: false,
            },
        });

        Season.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guildId: value,
                },
            }],
        }));
    };
    return Season;
};
