/* eslint-disable object-curly-newline */
module.exports = (sequelize, DataTypes) => {
    const Reputation = sequelize.define('Reputation', {
        timestamp: DataTypes.DATE,
    });
    Reputation.associate = (models) => {
        Reputation.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipientUserId',
        });
        Reputation.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giverUserId',
        });
    };
    return Reputation;
};
