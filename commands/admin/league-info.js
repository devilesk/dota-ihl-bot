const IHLCommand = require('../../lib/ihlCommand');
const {
    findLeague,
} = require('../../lib/db');

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

    async onMsg({ msg, guild }) {
        const league = await findLeague(guild.id);
        const data = league.toJSON();
        const fields = Object.keys(data).map(key => ({
            name: key,
            value: data[key],
            inline: true,
        }));
        await msg.channel.send({
            embed: {
                color: 100000,
                fields,
            },
        });
    }
};
