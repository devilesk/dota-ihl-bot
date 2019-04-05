const Sequelize = require('sequelize');

const Op = Sequelize.Op;

module.exports = (sequelize, DataTypes) => {
    const LeagueBot = sequelize.define('LeagueBot', {
        ticketed: {
            allowNull: false,
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, { underscored: true });
    LeagueBot.associate = (models) => {
        LeagueBot.belongsTo(models.League);
        LeagueBot.belongsTo(models.Bot);

        LeagueBot.addScope('ticketed', {
            where: {
                ticketed: true,
            },
        });

        LeagueBot.addScope('unticketed', {
            where: {
                ticketed: false,
            },
        });
        
        LeagueBot.addScope('guild_id', value => ({
            include: [{
                model: models.League,
                where: {
                    guild_id: value,
                },
            }],
        }));

        LeagueBot.addScope('steamid_64', value => ({
            include: [{
                model: models.Bot,
                where: {
                    steamid_64: value,
                },
            }],
        }));
    };
    return LeagueBot;
};
