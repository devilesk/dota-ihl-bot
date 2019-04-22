/* eslint-disable object-curly-newline */

/**
 * @class Commend
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Commend = sequelize.define('Commend', {
        /**
         * @memberof module:db.Commend
         * @instance
         */
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
