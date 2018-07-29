const { Command } = require('discord.js-commando');
const {
    ihlManager,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
} = require('../../lib/db');

/**
 * @class QueueJoinCommand
 * @extends external:Command
 */
module.exports = class QueueJoinCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-join',
            aliases: ['qjoin', 'join'],
            group: 'queue',
            memberName: 'queue-join',
            guildOnly: true,
            description: 'Join inhouse queue.',
            examples: ['queue-join', 'queuejoin', 'qjoin', 'join'],
        });
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const user = await findUserByDiscordId(guild.id)(discord_id);

        if (user) {
            if (user.rank_tier) {
                await ihlManager.joinInhouseQueue(guild, user);
            }
            else {
                await msg.say('Badge rank not set. Ping an admin to have them set it for you.');
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
