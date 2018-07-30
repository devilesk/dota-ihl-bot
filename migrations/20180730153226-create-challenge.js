module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Challenge', {
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
        finished: {
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
    }),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Challenge'),
};
