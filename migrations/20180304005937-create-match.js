module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Matches', {
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
        match_id: {
            allowNull: false,
            type: Sequelize.STRING,
            unique: true,
        },
        started_at: {
            type: Sequelize.DATE,
        },
        finished_at: {
            type: Sequelize.DATE,
        },
        valve_data: {
            type: Sequelize.JSONB,
        },
        odota_data: {
            type: Sequelize.JSONB,
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
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Matches'),
};
