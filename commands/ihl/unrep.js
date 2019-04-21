const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Db = require('../../lib/db');

/**
 * @class UnrepCommand
 * @extends IHLCommand
 */
module.exports = class UnrepCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'unrep',
            group: 'ihl',
            memberName: 'unrep',
            guildOnly: true,
            description: 'Unrep a player.',
            examples: ['unrep @Ari*', 'unrep Sasquatch'],
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
                const count = await Db.destroyReputation(fromUser)(user);
                logger.silly(count);
                if (count) {
                    await msg.say(`${msg.author.username} unreps ${discordUser.displayName}`);
                }
                else {
                    await msg.say(`${discordUser.displayName} not repped.`);
                }
            }
            else {
                await msg.say('Cannot unrep yourself.');
            }
        }
    }
};
