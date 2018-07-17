const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Queue = sequelize.define('Queue', {
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
    Queue.associate = (models) => {
        Queue.belongsTo(models.League);
        Queue.belongsTo(models.User);

        Queue.addScope('ready', {
            where: {
                ready: true,
            },
        });

        Queue.addScope('not_ready', {
            where: {
                ready: false,
            },
        });

        Queue.addScope('state', value => ({
            where: {
                state: value,
            },
        }));

        Queue.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guild_id: value,
                },
            }],
        }));

        Queue.addScope('steamid_64', value => ({
            include: [{
                model: models.User,
                where: {
                    steamid_64: value,
                },
            }],
        }));
    };
    return Queue;
};
