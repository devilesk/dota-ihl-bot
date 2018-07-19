const logger = require('../../lib/logger');
const { Command } = require('discord.js-commando');
const CONSTANTS = require('../../lib/constants');
const { findUserByDiscordId } = require('../../lib/db');

/**
 * @class GameModeCommand
 * @extends external:Command
 */
module.exports = class GameModeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'gamemode',
            group: 'ihl',
            memberName: 'gamemode',
            guildOnly: true,
            description: 'Set your game mode preference.',
            examples: ['gamemode cm', 'gamemode cd'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide a gamemode "cm" or "cd".',
                    type: 'string',
                    validate: (text) => {
                        if (text === 'cm' || text === 'cd') return true;
                        return 'Game mode must be "cm" or "cd".';
                    },
                },
            ],
        });
    }

    async run(msg, { text }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const game_mode = text === 'cm' ? CONSTANTS.DOTA_GAMEMODE_CM : CONSTANTS.DOTA_GAMEMODE_CD;
        let user = await findUserByDiscordId(guild.id)(discord_id);
        if (user) {
            user = await user.update({ game_mode_preference: game_mode });
            logger.debug(`Game mode set to ${text}`);
            await msg.say(`Game mode set to ${text}`);
        }
        else {
            logger.debug(`User ${discord_id} not found.`);
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
        return user;
    }
};
