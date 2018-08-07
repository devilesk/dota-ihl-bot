const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Queue = sequelize.define('Queue', {
        enabled: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        queue_type: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        queue_name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
    }, { underscored: true });
    Queue.associate = (models) => {
        Queue.belongsTo(models.League);

        Queue.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guild_id: value,
                },
            }],
        }));
    };
    return Queue;
};
