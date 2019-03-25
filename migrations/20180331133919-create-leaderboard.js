module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Leaderboards', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        league_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Leagues',
                key: 'id',
            },
        },
        season_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Seasons',
                key: 'id',
            },
        },
        user_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Users',
                key: 'id',
            },
        },
        rating: {
            type: Sequelize.INTEGER,
        },
        wins: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        losses: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
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
    .then(() => queryInterface.addIndex('Leaderboards', ['league_id']))
    .then(() => queryInterface.addIndex('Leaderboards', ['season_id']))
    .then(() => queryInterface.addIndex('Leaderboards', ['user_id'])),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Leaderboards'),
};
