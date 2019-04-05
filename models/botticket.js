const Sequelize = require('sequelize');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const BotTicket = sequelize.define('BotTicket', {
    }, { underscored: true });
    BotTicket.associate = (models) => {
        BotTicket.belongsTo(models.Bot);
        BotTicket.belongsTo(models.Ticket);
    };
    return BotTicket;
};
