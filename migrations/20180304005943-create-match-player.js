module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('MatchPlayers', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        match_id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            onDelete: 'CASCADE',
            references: {
                model: 'Matches',
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
        faction: {
            type: Sequelize.STRING,
        },
        hero_id: {
            type: Sequelize.INTEGER,
        },
        kills: {
            type: Sequelize.INTEGER,
        },
        deaths: {
            type: Sequelize.INTEGER,
        },
        assists: {
            type: Sequelize.INTEGER,
        },
        gpm: {
            type: Sequelize.INTEGER,
        },
        xpm: {
            type: Sequelize.INTEGER,
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
        .then(() => queryInterface.addConstraint('MatchPlayers', ['match_id', 'user_id'], {
            type: 'unique',
            name: 'uk_matchplayers_match_id_user_id',
        })),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('MatchPlayers'),
};
