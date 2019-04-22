/* eslint-disable object-curly-newline */

/**
 * @class LobbyQueuer
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const LobbyQueuer = sequelize.define('LobbyQueuer', {
        /**
         * @memberof module:db.LobbyQueuer
         * @instance
         */
        active: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        /**
         * @memberof module:db.LobbyQueuer
         * @instance
         */
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    });
    LobbyQueuer.associate = (models) => {
        LobbyQueuer.belongsTo(models.Lobby, {
            foreignKey: 'lobbyId',
        });
        LobbyQueuer.belongsTo(models.User, {
            foreignKey: 'userId',
        });
    };
    return LobbyQueuer;
};
