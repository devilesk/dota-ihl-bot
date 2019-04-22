/* eslint-disable object-curly-newline */

/**
 * @class Leaderboard
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Leaderboard = sequelize.define('Leaderboard', {
        rating: DataTypes.INTEGER,
        wins: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
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
