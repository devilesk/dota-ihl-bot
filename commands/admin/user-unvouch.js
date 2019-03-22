const { Command } = require('discord.js-commando');
const {
    ihlManager,
    getLobbyFromMessage,
    isMessageFromAnyInhouseAdmin,
} = require('../../lib/ihlManager');

/**
 * @class UserVouchCommand
 * @extends external:Command
 */
module.exports = class UserVouchCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'user-unvouch',
            aliases: ['unvouch'],
            group: 'admin',
            memberName: 'user-unvouch',
            guildOnly: true,
            description: 'Unvouch a user.',
            examples: ['unvouch @Ari* 5'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to unvouch.',
                    type: 'member',
                },
            ],
        });
    }

    hasPermission(msg) {
        return isMessageFromAnyInhouseAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const [user, discord_user, result_type] = await findUser(guild)(member);
        
        if (user) {
            await ihlManager.unvouchUser(user);
            await msg.say('User unvouched.');
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }
    }
};
