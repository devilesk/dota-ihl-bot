const Sequelize = require('sequelize');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const QueueUser = sequelize.define('QueueUser', {
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
    QueueUser.associate = (models) => {
        QueueUser.belongsTo(models.Queue);
        QueueUser.belongsTo(models.User);
    };
    return QueueUser;
};
