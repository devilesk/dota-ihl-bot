const CONSTANTS = require('../lib/constants');

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
        most_recent_activity: DataTypes.DATE,
        start_timestamp: DataTypes.DATE,
        end_timestamp: DataTypes.DATE,
    }, { underscored: true });
    Ticket.associate = (models) => {
        Ticket.belongsToMany(models.League, { through: models.LeagueTicket });
        Ticket.belongsToMany(models.Bot, { through: models.BotTicket });
    };
    return Ticket;
};
