/* eslint-disable object-curly-newline */
const CONSTANTS = require('../lib/constants');

/**
 * @class Bot
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Bot = sequelize.define('Bot', {
        /**
         * @memberof module:db.Bot
         * @instance
         */
        steamId64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Bot
         * @instance
         */
        accountName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Bot
         * @instance
         */
        personaName: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Bot
         * @instance
         */
        password: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Bot
         * @instance
         */
        status: {
            allowNull: false,
            type: DataTypes.STRING,
            defaultValue: CONSTANTS.BOT_OFFLINE,
        },
        /**
         * @memberof module:db.Bot
         * @instance
         */
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
