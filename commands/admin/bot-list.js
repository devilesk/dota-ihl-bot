const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const Fp = require('../../lib/util/fp');

const createBotDetails = async (bot) => {
    const tickets = await Db.getTicketsOf()(bot);
    const ticketNames = tickets.map(ticket => `${ticket.leagueid} - ${ticket.name}`).join(', ');
    return `**${bot.steamid_64}**
Account Name: ${bot.account_name}
Display Name: ${bot.persona_name}
Status: ${bot.status}
Tickets: ${ticketNames}`;
}

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
        logger.silly('BotListCommand');
        const bots = await Db.findAllBotsForLeague(league);
        const details = (await Fp.mapPromise(createBotDetails)(bots)).join('\t\n\n');
        return msg.say({
            embed: {
                color: 3447003,
                fields: [
                    {
                        name: 'Bots',
                        value: details || 'No bots.',
                        inline: false,
                    },
                ],
            },
        });
    }
};
