const { Command } = require('discord.js-commando');
const {
    ihlManager, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const {
    findLeague,
} = require('../../lib/db');

module.exports = class LeagueInfoCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'league-info',
            group: 'admin',
            memberName: 'league-info',
            guildOnly: true,
            description: 'Display inhouse league info.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const guild = msg.channel.guild;
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
