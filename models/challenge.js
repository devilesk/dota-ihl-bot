module.exports = (sequelize, DataTypes) => {
    const Challenge = sequelize.define('Challenge', {
        accepted: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        finished: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
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
