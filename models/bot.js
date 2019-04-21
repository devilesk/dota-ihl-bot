/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Bot = sequelize.define('Bot', {
        steamId64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        accountName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        personaName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        password: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        status: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.BOT_OFFLINE,
        },
        lobbyCount: {
            allowNull: false,
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    });
    Bot.associate = (models) => {
        Bot.hasMany(models.Lobby, {
            foreignKey: 'botId',
        });
        Bot.belongsToMany(models.Ticket, { through: models.BotTicket, foreignKey: 'botId', otherKey: 'ticketId' });
    };
    return Bot;
};
