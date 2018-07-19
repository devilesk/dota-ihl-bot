const { Command } = require('discord.js-commando');
const {
    ihlManager, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const {
    createSeason,
} = require('../../lib/db');

/**
 * @class LeagueSeasonCommand
 * @extends external:Command
 */
module.exports = class LeagueSeasonCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'league-season',
            group: 'admin',
            memberName: 'league-season',
            guildOnly: true,
            description: 'Start a new inhouse league season.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const guild = msg.channel.guild;
        await createSeason(guild.id);
        await msg.say('New league season started.');
    }
};
