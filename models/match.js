module.exports = (sequelize, DataTypes) => {
    const Match = sequelize.define('Match', {
        match_id: {
            allowNull: false,
            type: DataTypes.STRING,
            unique: true,
        },
        started_at: DataTypes.DATE,
        finished_at: DataTypes.DATE,
        valve_data: DataTypes.JSONB,
        odota_data: DataTypes.JSONB,
    }, { underscored: true });
    Match.associate = (models) => {
        Match.belongsTo(models.Lobby);
        Match.hasMany(models.MatchPlayer);
        Match.hasMany(models.Commend);
    };
    return Match;
};
