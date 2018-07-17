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
    }, {
        underscored: true,
    });
    Leaderboard.associate = (models) => {
        Leaderboard.belongsTo(models.League);
        Leaderboard.belongsTo(models.Season);
        Leaderboard.belongsTo(models.User);
    };
    return Leaderboard;
};
