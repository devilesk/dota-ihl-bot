/* eslint-disable object-curly-newline */
module.exports = (sequelize) => {
    const BotTicket = sequelize.define('BotTicket', {});
    BotTicket.associate = (models) => {
        BotTicket.belongsTo(models.Bot, {
            foreignKey: 'botId',
        });
        BotTicket.belongsTo(models.Ticket, {
            foreignKey: 'ticketId',
        });
    };
    return BotTicket;
};
