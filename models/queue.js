/* eslint-disable object-curly-newline */

/**
 * @class Queue
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Queue = sequelize.define('Queue', {
        /**
         * @memberof module:db.Queue
         * @instance
         */
        enabled: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        /**
         * @memberof module:db.Queue
         * @instance
         */
        timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
        /**
         * @memberof module:db.Queue
         * @instance
         */
        queueType: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Queue
         * @instance
         */
        queueName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
    });
    Queue.associate = (models) => {
        Queue.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });

        Queue.addScope('guild', value => ({
            include: [{
                model: models.League,
                where: {
                    guildId: value,
                },
            }],
        }));
    };
    return Queue;
};
