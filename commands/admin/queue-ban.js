const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/db');

/**
 * @class QueueBanCommand
 * @extends IHLCommand
 */
module.exports = class QueueBanCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-ban',
            aliases: ['qban', 'ban'],
            group: 'admin',
            memberName: 'queue-ban',
            guildOnly: true,
            description: 'Kick player from inhouse queue and tempban them.',
            examples: ['queue-ban @Ari* 5', 'queueban @Ari* 5', 'qban @Ari* 5', 'ban @Ari* 5'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to ban.',
                    type: 'member',
                },
                {
                    key: 'timeout',
                    prompt: 'How many minutes to timeout the user?',
                    type: 'integer',
                    default: 0,
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, inhouseState }, { member, timeout }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        
        if (user) {
            await this.ihlManager.banInhouseQueue(inhouseState, user, timeout);
            await msg.say(`User kicked from queue and tempbanned for ${timeout} minutes.`);
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }
    }
};
