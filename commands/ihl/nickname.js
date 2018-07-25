const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const { findUserByDiscordId } = require('../../lib/db');

/**
 * @class NicknameCommand
 * @extends external:Command
 */
module.exports = class NicknameCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'nickname',
            group: 'ihl',
            memberName: 'nickname',
            guildOnly: true,
            description: 'Set your nickname.',
            examples: ['nickname Arteezy'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide a nickname.',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { text }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const values = { nickname: text };
        let user = await findUserByDiscordId(guild.id)(discord_id);
        if (user) {
            user = await user.update(values);
            logger.debug(`User ${discord_id} nickname set to ${text}.`);
            await msg.say(`Nickname set to ${text}`);
        }
        else {
            logger.debug(`User ${discord_id} not found.`);
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
