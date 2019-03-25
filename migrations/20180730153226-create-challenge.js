module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Challenges', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        accepted: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
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
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
    .then(() => queryInterface.addIndex('Challenges', ['recipient_user_id']))
    .then(() => queryInterface.addIndex('Challenges', ['giver_user_id'])),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Challenges'),
};
