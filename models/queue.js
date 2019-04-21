/* eslint-disable object-curly-newline */
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
        queueType: {
            allowNull: false,
            type: DataTypes.STRING,
        },
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
