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
            name: 'user-vouch',
            aliases: ['vouch'],
            group: 'admin',
            memberName: 'user-vouch',
            guildOnly: true,
            description: 'Vouch a user.',
            examples: ['vouch @Ari* 5'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to vouch.',
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
            await ihlManager.vouchUser(user);
            await msg.say('User vouched.');
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }
    }
};
