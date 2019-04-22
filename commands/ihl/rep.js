const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Db = require('../../lib/db');

/**
 * @class RepCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class RepCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'rep',
            group: 'ihl',
            memberName: 'rep',
            guildOnly: true,
            description: 'Rep a player.',
            examples: ['rep @Ari*', 'rep Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
            ],
        }, {
            lobbyState: false,
            inhouseUserVouched: false,
        });
    }

    async onMsg({ msg, guild, inhouseUser }, { member }) {
        const [user, discordUser] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        if (user && fromUser) {
            if (user.id !== fromUser.id) {
                logger.silly(`RepCommand ${user.id} ${fromUser.id}`);
                const [, created] = await Db.findOrCreateReputation(fromUser)(user);
                if (created) {
                    return msg.say(`${msg.author.username} reps ${discordUser.displayName}.`);
                }
                return msg.say(`${discordUser.displayName} already repped.`);
            }
            return msg.say('Cannot rep yourself.');
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
