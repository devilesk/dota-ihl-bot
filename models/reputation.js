module.exports = (sequelize, DataTypes) => {
    const Reputation = sequelize.define('Reputation', {
        timestamp: DataTypes.DATE,
    }, { underscored: true });
    Reputation.associate = (models) => {
        Reputation.belongsTo(models.League);
        Reputation.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipient_user_id',
        });
        Reputation.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giver_user_id',
        });
    };
    return Reputation;
};
