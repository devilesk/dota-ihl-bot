const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');

/**
 * @class UserBadgeCommand
 * @extends IHLCommand
 */
module.exports = class UserBadgeCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'user-badge',
            aliases: ['badge'],
            group: 'admin',
            memberName: 'user-badge',
            guildOnly: true,
            description: "Set a user's badge rank.",
            examples: ['badge @Ari* 5'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user.',
                    type: 'string',
                },
                {
                    key: 'rank_tier',
                    prompt: 'Provide a badge rank.',
                    type: 'integer',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild }, { member, rank_tier }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        if (user) {
            await user.update({ rank_tier });
            await msg.say(`${member} badge set to ${rank_tier}.`);
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }
    }
};
