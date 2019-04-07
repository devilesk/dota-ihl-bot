const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

const createBotDetails = data => `**${data.steamid_64}**
Account Name: ${data.account_name}
Display Name: ${data.persona_name}
Status: ${data.status}`;

/**
 * @class BotListCommand
 * @extends IHLCommand
 */
module.exports = class BotListCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-list',
            aliases: ['list-bot', 'list-bots', 'bots-list'],
            group: 'admin',
            memberName: 'bot-list',
            guildOnly: true,
            description: 'List bots in the inhouse league.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league }) {
        const bots = await Db.findAllBotsForLeague(league);
        const bot_details = bots.map(createBotDetails).join('\t\n\n');
        await msg.say({
            embed: {
                color: 3447003,
                fields: [
                    {
                        name: 'Bots',
                        value: bot_details,
                        inline: false,
                    },
                ],
            },
        });
    }
};
