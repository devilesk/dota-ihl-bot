module.exports = (sequelize, DataTypes) => {
    const Challenge = sequelize.define('Challenge', {
        timestamp: DataTypes.DATE,
    }, { underscored: true });
    Challenge.associate = (models) => {
        Challenge.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipient_user_id',
        });
        Challenge.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giver_user_id',
        });
    };
    return Challenge;
};
