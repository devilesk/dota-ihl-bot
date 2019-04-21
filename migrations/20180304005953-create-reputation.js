/* eslint-disable object-curly-newline */
module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Reputations', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        recipientUserId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        giverUserId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        timestamp: {
            type: Sequelize.DATE,
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
        .then(() => queryInterface.addIndex('Reputations', ['recipientUserId']))
        .then(() => queryInterface.addIndex('Reputations', ['giverUserId']))
        .then(() => queryInterface.addConstraint('Reputations', ['recipientUserId', 'giverUserId'], {
            type: 'unique',
            name: 'uq_reputations_recipientUserId_giverUserId',
        })),
    down: queryInterface => queryInterface.dropTable('Reputations'),
};
