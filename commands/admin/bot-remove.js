const IHLCommand = require('../../lib/ihlCommand');
const {
    destroyBotBySteamID64,
} = require('../../lib/db');

/**
 * @class BotRemoveCommand
 * @extends IHLCommand
 */
module.exports = class BotRemoveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-remove',
            aliases: ['bot-delete', 'bot-destroy', 'delete-bot', 'remove-bot', 'destroy-bot'],
            group: 'admin',
            memberName: 'bot-remove',
            guildOnly: true,
            description: 'Remove a bot from the inhouse league.',
            examples: ['bot-remove steamid_64'],
            args: [
                {
                    key: 'steamid_64',
                    prompt: 'Provide a steam id.',
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

    async onMsg({ msg, league }, { steamid_64 }) {
        await destroyBotBySteamID64(league)(steamid_64);
        await msg.say(`Bot ${steamid_64} removed.`);
    }
};
