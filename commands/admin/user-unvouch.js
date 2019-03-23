const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
    unvouchUser,
} = require('../../lib/db');

/**
 * @class UserVouchCommand
 * @extends IHLCommand
 */
module.exports = class UserVouchCommand extends IHLCommand {
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
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild }, { member }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        if (user) {
            await unvouchUser(user);
            await msg.say('User unvouched.');
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }
    }
};
