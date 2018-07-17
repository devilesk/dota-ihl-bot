module.exports = (sequelize, DataTypes) => {
    const Commend = sequelize.define('Commend', {
        timestamp: DataTypes.DATE,
    }, { underscored: true });
    Commend.associate = (models) => {
        Commend.belongsTo(models.Match);
        Commend.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipient_user_id',
        });
        Commend.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giver_user_id',
        });
    };
    return Commend;
};
