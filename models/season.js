module.exports = (sequelize, DataTypes) => {
    const Season = sequelize.define('Season', {
        active: DataTypes.BOOLEAN,
    },
    {
        underscored: true,
    });
    Season.associate = (models) => {
        Season.belongsTo(models.League);
        Season.hasMany(models.Lobby);
        Season.hasMany(models.Commend);
        Season.hasMany(models.Leaderboard);

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
                    guild_id: value,
                },
            }],
        }));
    };
    return Season;
};
