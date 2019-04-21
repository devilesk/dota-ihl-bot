const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');

/**
 * @class LeagueInfoCommand
 * @extends IHLCommand
 */
module.exports = class LeagueInfoCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'league-info',
            group: 'admin',
            memberName: 'league-info',
            guildOnly: true,
            description: 'Display inhouse league info.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, league }) {
        const data = league.toJSON();
        logger.silly(data);
        const fields = Object.keys(data).map(key => ({
            name: key,
            value: data[key] || 'N/A',
            inline: true,
        }));
        const tickets = await Db.getTicketsOf()(league);
        const ticketNames = tickets.map(ticket => `${ticket.leagueid} - ${ticket.name}`).join(', ');
        if (tickets.length) {
            fields.push({
                name: 'Available Tickets',
                value: ticketNames,
                inline: false,
            });
        }
        return msg.channel.send({
            embed: {
                color: 100000,
                fields,
            },
        });
    }
};
