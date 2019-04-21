module.exports = (sequelize, DataTypes) => {
    const Ticket = sequelize.define('Ticket', {
        leagueid: {
            allowNull: false,
            type: DataTypes.INTEGER,
            unique: true,
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        mostRecentActivity: DataTypes.DATE,
        startTimestamp: DataTypes.DATE,
        endTimestamp: DataTypes.DATE,
    });
    Ticket.associate = (models) => {
        Ticket.belongsToMany(models.League, { through: models.LeagueTicket, foreignKey: 'ticketId', otherKey: 'leagueId' });
        Ticket.belongsToMany(models.Bot, { through: models.BotTicket, foreignKey: 'ticketId', otherKey: 'botId' });
    };
    return Ticket;
};
