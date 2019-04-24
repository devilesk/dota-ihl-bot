const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const DotaBot = require('../../lib/dotaBot');
const CONSTANTS = require('../../lib/constants');

/**
 * @class BotAddCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class BotAddCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-add',
            aliases: ['bot-create', 'bot-update', 'add-bot', 'create-bot', 'update-bot'],
            group: 'owner',
            memberName: 'bot-add',
            description: 'Add a bot to the inhouse league.',
            examples: ['bot-add steamId64 accountName personaName password'],
            args: [
                {
                    key: 'steamId64',
                    prompt: 'Provide a steam id.',
                    type: 'string',
                },
                {
                    key: 'accountName',
                    prompt: 'Provide a steam account name.',
                    type: 'string',
                },
                {
                    key: 'personaName',
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
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }, { steamId64, accountName, personaName, password }) {
        const [bot, created] = await Db.findOrCreateBot(steamId64, accountName, personaName, password);
        if (created) {
            await Db.updateBotStatus(CONSTANTS.BOT_LOADING)(bot.id);
            const dotaBot = await DotaBot.createDotaBot(bot);
            await DotaBot.connectDotaBot(dotaBot);
            await msg.say(`Bot ${steamId64} connected.`);
            const tickets = await DotaBot.loadDotaBotTickets(dotaBot);
            await msg.say(`${tickets.length} tickets loaded.`);
            await DotaBot.disconnectDotaBot(dotaBot);
            await msg.say(`Bot ${steamId64} disconnected.`);
            await this.ihlManager[CONSTANTS.EVENT_BOT_AVAILABLE]();
            return msg.say(`Bot ${steamId64} added.`);
        }
        await Db.updateBot(steamId64)({ accountName, personaName, password });
        return msg.say(`Bot ${steamId64} updated.`);
    }
};
