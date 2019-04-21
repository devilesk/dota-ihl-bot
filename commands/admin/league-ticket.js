const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LeagueTicketCommand
 * @extends IHLCommand
 */
module.exports = class LeagueTicketCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'league-ticket',
            aliases: ['set-ticket', 'ticket-set'],
            group: 'admin',
            memberName: 'league-ticket',
            guildOnly: true,
            description: 'Set the current dota ticket for the league.',
            examples: ['league-ticket 1063'],
            args: [
                {
                    key: 'leagueid',
                    prompt: 'Provide the ticket league id.',
                    type: 'integer',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league }, { leagueid }) {
        logger.debug('LeagueTicketCommand');
        const ticket = await this.ihlManager[CONSTANTS.EVENT_LEAGUE_TICKET_SET](league, leagueid);
        if (ticket) {
            return msg.say(`League set to use ticket ${leagueid} - ${ticket.name}.`);
        }
        return msg.say(`Ticket ${leagueid} not found.`);
    }
};
