const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const { findUserByDiscordId } = require('../../lib/db');

/**
 * @class RolesCommand
 * @extends external:Command
 */
module.exports = class RolesCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'roles',
            group: 'ihl',
            memberName: 'roles',
            guildOnly: true,
            description: 'Set your dota role (positions 1-5) preference.',
            examples: ['roles 5', 'roles 5,2', 'roles 3,4,1'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide a comma-separated list of role numbers 1 to 5.',
                    type: 'string',
                },
            ],
        });
    }

    async run(msg, { text }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const values = {};
        let roles = text.split(',').map(x => parseInt(x)).filter(x => !isNaN(x) && x >= 1 && x <= 5);
        roles = roles.filter((x, pos) => roles.indexOf(x) === pos);
        for (let i = 1; i <= 5; i++) {
            values[`role_${i}`] = roles.indexOf(i);
        }
        let user = await findUserByDiscordId(guild.id)(discord_id);
        if (user) {
            if (roles.length) {
                user = await user.update(values);
                logger.debug(`Roles set to ${roles.join(',')}`);
                await msg.say(`Roles set to ${roles.join(',')}`);
            }
            else {
                await msg.say('No valid roles specified.');
            }
        }
        else {
            logger.debug(`User ${discord_id} not found.`);
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
        return user;
    }
};
