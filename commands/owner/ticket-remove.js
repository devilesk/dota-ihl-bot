const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class TicketRemoveCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class TicketRemoveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'ticket-remove',
            aliases: ['remove-ticket'],
            group: 'owner',
            memberName: 'ticket-remove',
            guildOnly: true,
            description: 'Remove a dota ticket from the league.',
            examples: ['ticket-remove 1063'],
            args: [
                {
                    key: 'leagueid',
                    prompt: 'Provide a ticket league id.',
                    type: 'integer',
                },
            ],
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league }, { leagueid }) {
        await this.ihlManager[CONSTANTS.EVENT_LEAGUE_TICKET_REMOVE](league, leagueid);
        return msg.say(`Removed ticket ${leagueid} from the league.`);
    }
};
