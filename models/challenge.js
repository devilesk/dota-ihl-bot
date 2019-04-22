/**
 * @class Challenge
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Challenge = sequelize.define('Challenge', {
        /**
         * @memberof module:db.Challenge
         * @instance
         */
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
