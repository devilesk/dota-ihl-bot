/* eslint-disable object-curly-newline */
module.exports = (sequelize, DataTypes) => {
    const Commend = sequelize.define('Commend', {
        timestamp: DataTypes.DATE,
    });
    Commend.associate = (models) => {
        Commend.belongsTo(models.Lobby, {
            foreignKey: 'lobbyId',
        });
        Commend.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipientUserId',
        });
        Commend.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giverUserId',
        });
    };
    return Commend;
};
