/**
 * @class Ticket
 * @category Database
 * @memberof module:db
 * @extends external:sequelize.Model
 */
module.exports = (sequelize, DataTypes) => {
    const Ticket = sequelize.define('Ticket', {
        /**
         * @memberof module:db.Ticket
         * @instance
         */
        leagueid: {
            allowNull: false,
            type: DataTypes.INTEGER,
            unique: true,
        },
        /**
         * @memberof module:db.Ticket
         * @instance
         */
        name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        /**
         * @memberof module:db.Ticket
         * @instance
         */
        mostRecentActivity: DataTypes.DATE,
        /**
         * @memberof module:db.Ticket
         * @instance
         */
        startTimestamp: DataTypes.DATE,
        /**
         * @memberof module:db.Ticket
         * @instance
         */
        endTimestamp: DataTypes.DATE,
    });
    Ticket.associate = (models) => {
        Ticket.belongsToMany(models.League, { through: models.LeagueTicket, foreignKey: 'ticketId', otherKey: 'leagueId' });
        Ticket.belongsToMany(models.Bot, { through: models.BotTicket, foreignKey: 'ticketId', otherKey: 'botId' });
    };
    return Ticket;
};
