const { Command } = require('discord.js-commando');
const {
    ihlManager, getInhouse,
} = require('../../lib/ihlManager');

/**
 * @class LeagueCreateCommand
 * @extends external:Command
 */
module.exports = class LeagueCreateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'league-create',
            group: 'admin',
            memberName: 'league-create',
            guildOnly: true,
            description: 'Create an inhouse league for the server.',
        });
    }

    hasPermission(msg) {
        return this.client.isOwner(msg.author);
    }

    async run(msg) {
        const inhouse = getInhouse(ihlManager.inhouseStates, guild);
        if (!inhouse) {
            ihlManager.createNewLeague(msg.channel.guild);
            await msg.say('Inhouse league created.');
        }
        else {
            await msg.say('Inhouse league already exists.');
        }
    }
};
