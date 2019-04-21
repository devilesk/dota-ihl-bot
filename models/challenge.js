module.exports = (sequelize, DataTypes) => {
    const Challenge = sequelize.define('Challenge', {
        accepted: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    });
    Challenge.associate = (models) => {
        Challenge.belongsTo(models.User, {
            as: 'Recipient',
            foreignKey: 'recipientUserId',
        });
        Challenge.belongsTo(models.User, {
            as: 'Giver',
            foreignKey: 'giverUserId',
        });
    };
    return Challenge;
};
