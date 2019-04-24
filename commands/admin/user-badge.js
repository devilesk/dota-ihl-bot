const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const { parseRankTier, rankTierToMedalName } = require('../../lib/util/rankTier');

/**
 * @class UserBadgeCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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
                    key: 'badge',
                    prompt: 'Provide a badge rank.',
                    type: 'string',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild }, { member, badge }) {
        logger.debug('UserBadgeCommand');
        const rankTier = parseRankTier(badge);
        if (rankTier !== null) {
            const [user, discordUser] = await findUser(guild)(member);
            if (user) {
                await user.update({ rankTier });
                return msg.say(`${discordUser.displayName} badge set to ${rankTierToMedalName(rankTier)}.`);
            }
            return msg.say(IHLCommand.UserNotFoundMessage);
        }
        return msg.say(`Could not parse badge from ${badge}.`);
    }
};
