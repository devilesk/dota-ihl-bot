const CONSTANTS = require('../lib/constants');

module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('Users', {
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
        steamid_64: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        discord_id: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        nickname: {
            type: Sequelize.STRING,
        },
        role_1: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role_2: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role_3: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role_4: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        role_5: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: -1,
        },
        queue_timeout: {
            type: Sequelize.DATE,
        },
        vouched: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
            defaultValue: false,
        },
        rank_tier: {
            type: Sequelize.INTEGER,
        },
        game_mode_preference: {
            allowNull: false,
            type: Sequelize.STRING,
            defaultValue: CONSTANTS.DOTA_GAMEMODE_CM,
        },
        commends: {
            allowNull: false,
            type: Sequelize.INTEGER,
            defaultValue: 0,
        },
        reputation: {
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
    .then(() => queryInterface.addIndex('Users', ['league_id'])),
    down: (queryInterface, Sequelize) => queryInterface.dropTable('Users'),
};
