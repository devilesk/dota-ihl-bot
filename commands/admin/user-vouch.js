const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');

/**
 * @class UserVouchCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class UserVouchCommand extends IHLCommand {
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

    async onMsg({ msg, guild }, { member }) {
        logger.debug('UserVouchCommand');
        const [user, discordUser] = await findUser(guild)(member);
        if (user) {
            await user.update({ vouched: true });
            return msg.say(`${discordUser.displayName} vouched.`);
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
