const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
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
            await Db.unvouchUser(user);
            return msg.say(`${discordUser.displayName} unvouched.`);
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
