module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Commends', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        lobby_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Lobbies',
                key: 'id',
            },
        },
        recipient_user_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        giver_user_id: {
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
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
    .then(() => queryInterface.addIndex('Commends', ['lobby_id']))
    .then(() => queryInterface.addIndex('Commends', ['recipient_user_id']))
    .then(() => queryInterface.addIndex('Commends', ['giver_user_id']))
    .then(() => queryInterface.addConstraint('Commends', ['lobby_id', 'recipient_user_id', 'giver_user_id'], {
        type: 'unique',
        name: 'uq_commends_lobby_id_recipient_user_id_giver_user_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Commends'),
};
