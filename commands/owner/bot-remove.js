const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

/**
 * @class BotRemoveCommand
 * @extends IHLCommand
 */
module.exports = class BotRemoveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-remove',
            aliases: ['bot-delete', 'bot-destroy', 'delete-bot', 'remove-bot', 'destroy-bot'],
            group: 'owner',
            memberName: 'bot-remove',
            guildOnly: true,
            description: 'Remove a bot from the inhouse league.',
            examples: ['bot-remove steamId64'],
            args: [
                {
                    key: 'steamId64',
                    prompt: 'Provide a steam id.',
                    type: 'string',
                },
            ],
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }, { steamId64 }) {
        const result = await Db.destroyBotBySteamID64(steamId64);
        logger.silly(`BotRemoveCommand ${result}`);
        if (result) {
            return msg.say(`Bot ${steamId64} removed.`);
        }
        return msg.say('No bot removed.');
    }
};
