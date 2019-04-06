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
            group: 'admin',
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
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, league }, { leagueid, name }) {
        this.ihlManager.emit(CONSTANTS.EVENT_LEAGUE_TICKET_ADD, league, leagueid, name);
        await msg.say(`Added ticket ${name} to league.`);
    }
};
