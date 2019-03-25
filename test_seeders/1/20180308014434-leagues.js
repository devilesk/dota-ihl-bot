module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.bulkInsert('Leagues', [{
        guild_id: '422549177151782925',
        ready_check_timeout: 5000,
        captain_rank_threshold: 3,
        current_season_id: 1,
        category_name: 'inhouses',
        channel_name: 'general',
        admin_role_name: 'Inhouse Admin',
        created_at: new Date(),
        updated_at: new Date(),
    }], {}),

    down: (queryInterface, Sequelize) => queryInterface.bulkDelete('Leagues', null, {}),
};
