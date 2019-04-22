/* eslint-disable object-curly-newline */

/**
 * @class LeagueTicket
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize) => {
    const LeagueTicket = sequelize.define('LeagueTicket', {});
    LeagueTicket.associate = (models) => {
        LeagueTicket.belongsTo(models.League, {
            foreignKey: 'leagueId',
        });
        LeagueTicket.belongsTo(models.Ticket, {
            foreignKey: 'ticketId',
        });
    };
    return LeagueTicket;
};
