const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const { findUser } = require('../../lib/ihlManager');
const {
    findUserByDiscordId, findOrCreateLeague, findOrCreateReputation,
} = require('../../lib/db');

module.exports = class RepCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'rep',
            group: 'ihl',
            memberName: 'rep',
            guildOnly: true,
            description: 'Rep a player.',
            examples: ['rep @Ari*', 'rep Sasquatch'],
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
        logger.debug('RepCommand run');
        const guild = msg.channel.guild;
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const fromUser = await findUserByDiscordId(guild.id)(msg.author.id);
        if (discord_user.id !== msg.author.id) {
            if (user && fromUser) {
                const league = await findOrCreateLeague(guild.id);
                const [rep, created] = await findOrCreateReputation(league)(fromUser)(user);
                logger.debug(rep);
                logger.debug(created);
                if (created) {
                    await msg.say(`${msg.author.username} reps ${discord_user.displayName}`);
                }
                else {
                    await msg.say(`${discord_user.displayName} already repped.`);
                }
                return [rep, created];
            }
        }
        return [];
    }
};
