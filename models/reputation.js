/* eslint-disable object-curly-newline */

/**
 * @class Reputation
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Reputation = sequelize.define('Reputation', {
        /**
         * @memberof module:db.Reputation
         * @instance
         */
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
