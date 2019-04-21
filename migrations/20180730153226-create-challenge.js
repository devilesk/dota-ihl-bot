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
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
        },
    })
        .then(() => queryInterface.addIndex('Challenges', ['recipientUserId']))
        .then(() => queryInterface.addIndex('Challenges', ['giverUserId'])),
    down: queryInterface => queryInterface.dropTable('Challenges'),
};
