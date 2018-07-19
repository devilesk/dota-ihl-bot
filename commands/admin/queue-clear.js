const { Command } = require('discord.js-commando');
const {
    ihlManager, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const {
    destroyQueuesByGuildId,
} = require('../../lib/db');

/**
 * @class QueueClearCommand
 * @extends external:Command
 */
module.exports = class QueueClearCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-clear',
            aliases: ['qclear', 'clear'],
            group: 'admin',
            memberName: 'queue-clear',
            guildOnly: true,
            description: 'Clear inhouse queue.',
            examples: ['queue-clear', 'queueclear', 'qclear', 'clear'],
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;

        await destroyQueuesByGuildId(guild.id);
        await msg.say('Queue cleared.');
    }
};
