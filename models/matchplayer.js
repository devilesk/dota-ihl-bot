module.exports = (sequelize, DataTypes) => {
    const MatchPlayer = sequelize.define('MatchPlayer', {
        faction: DataTypes.STRING,
        hero_id: DataTypes.INTEGER,
        kills: DataTypes.INTEGER,
        deaths: DataTypes.INTEGER,
        assists: DataTypes.INTEGER,
        gpm: DataTypes.INTEGER,
        xpm: DataTypes.INTEGER,
    }, { underscored: true });
    MatchPlayer.associate = (models) => {
        MatchPlayer.belongsTo(models.Match);
        MatchPlayer.belongsTo(models.User);
    };
    return MatchPlayer;
};
