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

    async onMsg({ msg, guild, league }, { leagueid, name }) {
        this.ihlManager.emit(CONSTANTS.EVENT_LEAGUE_TICKET_SET, league, leagueid);
        await msg.say(`League set to use ticket ${name}.`);
    }
};
