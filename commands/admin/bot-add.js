const IHLCommand = require('../../lib/ihlCommand');
const {
    findOrCreateBot,
    updateBot,
} = require('../../lib/db');

/**
 * @class BotAddCommand
 * @extends IHLCommand
 */
module.exports = class BotAddCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-add',
            aliases: ['bot-create', 'bot-update', 'add-bot', 'create-bot', 'update-bot'],
            group: 'admin',
            memberName: 'bot-add',
            guildOnly: true,
            description: 'Add a bot to the inhouse league.',
            examples: ['bot-add steamid_64 account_name persona_name password'],
            args: [
                {
                    key: 'steamid_64',
                    prompt: 'Provide a steam id.',
                    type: 'string',
                },
                {
                    key: 'account_name',
                    prompt: 'Provide a steam account name.',
                    type: 'string',
                },
                {
                    key: 'persona_name',
                    prompt: 'Provide a steam display name.',
                    type: 'string',
                },
                {
                    key: 'password',
                    prompt: 'Provide a steam account password.',
                    type: 'string',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, inhouseState, guild, league }, { steamid_64, account_name, persona_name, password }) {
        const [bot, created] = await findOrCreateBot(league, steamid_64, account_name, persona_name, password);
        if (created) {
            await msg.say(`Bot ${steamid_64} added.`);
        }
        else {
            await updateBot(league)(steamid_64)({ account_name, persona_name, password });
            await msg.say(`Bot ${steamid_64} updated.`);
        }
    }
};
