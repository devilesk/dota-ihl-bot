const Sequelize = require('sequelize');

const Op = Sequelize.Op;

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
    }, { underscored: true });
    LobbyQueuer.associate = (models) => {
        LobbyQueuer.belongsTo(models.Lobby);
        LobbyQueuer.belongsTo(models.User);
    };
    return LobbyQueuer;
};
