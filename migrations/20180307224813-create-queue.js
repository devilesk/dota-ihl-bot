module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Queues', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        leagueId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        enabled: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: true,
        },
        timestamp: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        queueType: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        queueName: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
        .then(() => queryInterface.addIndex('Queues', ['leagueId']))
        .then(() => queryInterface.addConstraint('Queues', ['leagueId', 'queueType'], {
            type: 'unique',
            name: 'uq_queues_leagueId_queueType',
        })),
    down: queryInterface => queryInterface.dropTable('Queues'),
};
