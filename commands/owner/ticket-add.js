const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class TicketAddCommand
 * @extends IHLCommand
 */
module.exports = class TicketAddCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'ticket-add',
            aliases: ['add-ticket'],
            group: 'owner',
            memberName: 'ticket-add',
            guildOnly: true,
            description: 'Add a dota ticket to the league.',
            examples: ['ticket-add 1063 TicketName'],
            args: [
                {
                    key: 'leagueid',
                    prompt: 'Provide the ticket league id.',
                    type: 'integer',
                },
                {
                    key: 'name',
                    prompt: 'Provide the ticket name.',
                    type: 'string',
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

    async onMsg({ msg, guild, league }, { leagueid, name }) {
        await this.ihlManager[CONSTANTS.EVENT_LEAGUE_TICKET_ADD](league, leagueid, name);
        await msg.say(`Added ticket ${name} to league.`);
    }
};
