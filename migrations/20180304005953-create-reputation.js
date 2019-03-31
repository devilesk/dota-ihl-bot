module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Reputations', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
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
    .then(() => queryInterface.addIndex('Reputations', ['recipient_user_id']))
    .then(() => queryInterface.addIndex('Reputations', ['giver_user_id']))
    .then(() => queryInterface.addConstraint('Reputations', ['recipient_user_id', 'giver_user_id'], {
        type: 'unique',
        name: 'uq_reputations_recipient_user_id_giver_user_id',
    })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Reputations'),
};
