const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const db = require('../../models');

const validLeagueAttributes = Object.keys(db.League.attributes).filter(key => !db.League.attributes[key]._autoGenerated);
const settingMap = {};

validLeagueAttributes.forEach((a) => {
    settingMap[a.toLowerCase().replace(/_/g, '')] = a;
});

/**
 * @class LeagueUpdateCommand
 * @extends IHLCommand
 */
class LeagueUpdateCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'league-update',
            group: 'admin',
            memberName: 'league-update',
            guildOnly: true,
            description: 'Update an inhouse league setting.',
            args: [
                {
                    key: 'setting',
                    prompt: `Provide a league setting. (${Object.keys(settingMap).join(', ')})`,
                    type: 'string',
                    validate: (setting) => {
                        if (LeagueUpdateCommand.isValidSetting(setting)) return true;
                        return `Setting must be one of ${Object.keys(settingMap).join(', ')}`;
                    },
                },
                {
                    key: 'value',
                    prompt: 'Provide a value for the league setting.',
                    type: 'string',
                    validate: value => (value ? true : 'Must provide a setting value.'),
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    static get settingMap() {
        return settingMap;
    }

    static isValidSetting(setting) {
        return Object.keys(settingMap).indexOf(setting.toLowerCase().replace(/_/g, '')) !== -1;
    }

    async onMsg({ msg, guild }, { setting, value }) {
        logger.silly('LeagueUpdateCommand');
        const field = settingMap[setting.toLowerCase().replace(/_/g, '')];
        await Db.updateLeague(guild.id)({ [field]: value });
        return msg.say(`League setting updated. ${setting} set to ${value}.`);
    }
}

module.exports = LeagueUpdateCommand;
