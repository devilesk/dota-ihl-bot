const { Command } = require('discord.js-commando');
const {
    findUserByDiscordId, findAllInQueueWithUser,
} = require('../../lib/db');

module.exports = class QueueStatusCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-status',
            aliases: ['qstatus', 'status'],
            group: 'queue',
            memberName: 'queue-status',
            guildOnly: true,
            description: 'Display players in queue.',
            examples: ['queue-status', 'queuestatus', 'qstatus', 'status'],
        });
    }

    static async getQueueNames(guild) {
        const queues = await findAllInQueueWithUser();
        return queues.map((queue) => {
            const discord_user = guild.member(queue.User.discord_id);
            if (discord_user) {
                return discord_user.displayName;
            }
            return queue.User.nickname ? queue.User.nickname : 'unknown';
        });
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const user = await findUserByDiscordId(guild.id)(discord_id);

        if (user) {
            const userNames = await QueueStatusCommand.getQueueNames(guild);
            if (userNames.length) {
                await msg.say(`${userNames.length} in queue: ${userNames.join(', ')}`);
            }
            else {
                await msg.say('0 in queue.');
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
