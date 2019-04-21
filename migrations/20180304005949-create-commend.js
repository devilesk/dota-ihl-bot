/* eslint-disable object-curly-newline */
module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Commends', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        lobbyId: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Lobbies',
                key: 'id',
            },
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
        .then(() => queryInterface.addIndex('Commends', ['lobbyId']))
        .then(() => queryInterface.addIndex('Commends', ['recipientUserId']))
        .then(() => queryInterface.addIndex('Commends', ['giverUserId']))
        .then(() => queryInterface.addConstraint('Commends', ['lobbyId', 'recipientUserId', 'giverUserId'], {
            type: 'unique',
            name: 'uq_commends_lobbyId_recipientUserId_giverUserId',
        })),
    down: queryInterface => queryInterface.dropTable('Commends'),
};
