/* eslint-disable object-curly-newline */

/**
 * @class Leaderboard
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Leaderboard = sequelize.define('Leaderboard', {
        /**
         * @memberof module:db.Leaderboard
         * @instance
         */
        rating: DataTypes.INTEGER,
        /**
         * @memberof module:db.Leaderboard
         * @instance
         */
        wins: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        /**
         * @memberof module:db.Leaderboard
         * @instance
         */
        losses: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    });
    Leaderboard.associate = (models) => {
        Leaderboard.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });
        Leaderboard.belongsTo(models.Season, {
            foreignKey: 'seasonId',
        });
        Leaderboard.belongsTo(models.User, {
            foreignKey: 'userId',
        });
    };
    return Leaderboard;
};
