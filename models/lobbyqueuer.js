const Sequelize = require('sequelize');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const LobbyQueuer = sequelize.define('LobbyQueuer', {
        ready: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        state: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.QUEUE_IN_QUEUE,
        },
    }, { underscored: true });
    LobbyQueuer.associate = (models) => {
        LobbyQueuer.belongsTo(models.Lobby);
        LobbyQueuer.belongsTo(models.User);
    };
    return LobbyQueuer;
};
