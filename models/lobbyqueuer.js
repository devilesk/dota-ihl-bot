/* eslint-disable object-curly-newline */

/**
 * @class LobbyQueuer
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const LobbyQueuer = sequelize.define('LobbyQueuer', {
        active: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
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
