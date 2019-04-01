const CONSTANTS = require('../lib/constants');

module.exports = (sequelize, DataTypes) => {
    const Bot = sequelize.define('Bot', {
        steamid_64: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        account_name: {
            allowNull: false,
            type: DataTypes.STRING,
        },
        persona_name: {
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
    }, { underscored: true });
    Bot.associate = (models) => {
        Bot.belongsTo(models.League);
        Bot.hasMany(models.Lobby);
    };
    return Bot;
};
