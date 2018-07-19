const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const { findUser } = require('../../lib/ihlManager');
const {
    findUserByDiscordId, findOrCreateLeague, destroyReputation,
} = require('../../lib/db');

/**
 * @class UnrepCommand
 * @extends external:Command
 */
module.exports = class UnrepCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unrep',
            group: 'ihl',
            memberName: 'unrep',
            guildOnly: true,
            description: 'Unrep a player.',
            examples: ['unrep @Ari*', 'unrep Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { member }) {
        logger.debug('UnrepCommand run');
        const guild = msg.channel.guild;
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const fromUser = await findUserByDiscordId(guild.id)(msg.author.id);
        if (discord_user.id !== msg.author.id) {
            if (user && fromUser) {
                const league = await findOrCreateLeague(guild.id);
                const count = await destroyReputation(league)(fromUser)(user);
                logger.debug(count);
                if (count) {
                    await msg.say(`${msg.author.username} unreps ${discord_user.displayName}`);
                }
                else {
                    await msg.say(`${discord_user.displayName} not repped.`);
                }
                return count;
            }
        }
    }
};
