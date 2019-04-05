const Sequelize = require('sequelize');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const LeagueTicket = sequelize.define('LeagueTicket', {
    }, { underscored: true });
    LeagueTicket.associate = (models) => {
        LeagueTicket.belongsTo(models.League);
        LeagueTicket.belongsTo(models.Ticket);
    };
    return LeagueTicket;
};
