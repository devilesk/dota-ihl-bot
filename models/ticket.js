const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Ticket = sequelize.define('Ticket', {
        dota_league_id: {
            allowNull: false,
            type: DataTypes.INTEGER,
            unique: true,
        },
        name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        most_recent_activity: DataTypes.DATE,
        start_timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
        },
        end_timestamp: {
            allowNull: false,
            type: DataTypes.DATE,
        },
    }, { underscored: true });
    Ticket.associate = (models) => {
        Ticket.belongsToMany(models.League, { as: 'Leagues', through: models.LeagueTicket });
        Ticket.belongsToMany(models.Bot, { as: 'Bots', through: models.BotTicket });
    };
    return Ticket;
};
