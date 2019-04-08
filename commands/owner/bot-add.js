const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const DotaBot = require('../../lib/dotaBot');
const CONSTANTS = require('../../lib/constants');

/**
 * @class BotAddCommand
 * @extends IHLCommand
 */
module.exports = class BotAddCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-add',
            aliases: ['bot-create', 'bot-update', 'add-bot', 'create-bot', 'update-bot'],
            group: 'owner',
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
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }, { steamid_64, account_name, persona_name, password }) {
        const [bot, created] = await Db.findOrCreateBot(steamid_64, account_name, persona_name, password);
        if (created) {
            await Db.updateBotStatus(CONSTANTS.BOT_LOADING)(bot.id);
            const dotaBot = await DotaBot.createDotaBot(bot);
            await DotaBot.connectDotaBot(dotaBot);
            await msg.say(`Bot ${steamid_64} connected.`);
            const tickets = await DotaBot.loadDotaBotTickets(dotaBot);
            await msg.say(`${tickets.length} tickets loaded.`);
            await DotaBot.disconnectDotaBot(dotaBot);
            await msg.say(`Bot ${steamid_64} disconnected.`);
            this.ihlManager.emit(CONSTANTS.EVENT_BOT_AVAILABLE);
            await msg.say(`Bot ${steamid_64} added.`);
        }
        else {
            await Db.updateBot(steamid_64)({ account_name, persona_name, password });
            await msg.say(`Bot ${steamid_64} updated.`);
        }
    }
};
