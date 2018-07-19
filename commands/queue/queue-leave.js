const { Command } = require('discord.js-commando');
const {
    ihlManager,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
} = require('../../lib/db');

/**
 * @class QueueLeaveCommand
 * @extends external:Command
 */
module.exports = class QueueLeaveCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-leave',
            aliases: ['qleave', 'leave'],
            group: 'queue',
            memberName: 'queue-leave',
            guildOnly: true,
            description: 'Leave inhouse queue.',
            examples: ['queue-leave', 'queueleave', 'qleave', 'leave'],
        });
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const user = await findUserByDiscordId(guild.id)(discord_id);

        if (user) {
            await ihlManager.leaveInhouseQueue(guild, user);
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
