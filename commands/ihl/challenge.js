const { Command } = require('discord.js-commando');
const {
    findUserByDiscordId,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');

/**
 * @class ChallengeCommand
 * @extends external:Command
 */
module.exports = class ChallengeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'challenge',
            group: 'ihl',
            memberName: 'challenge',
            guildOnly: true,
            description: 'Player challenge command.',
            examples: ['challenge @Ari*'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player mention.',
                    type: 'member',
                }
            ],
        });
    }

    async run(msg, { member }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const user = await findUserByDiscordId(guild.id)(discord_id);
        if (user) {

        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
