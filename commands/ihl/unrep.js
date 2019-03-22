const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
const {
    findOrCreateLeague,
    destroyReputation,
} = require('../../lib/db');

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
        });
    }

    async onMsg({ msg, guild, inhouseUser }, { member }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        if (user && fromUser) {
            if (user.id !== fromUser.id) {
                const league = await findOrCreateLeague(guild.id);
                const count = await destroyReputation(league)(fromUser)(user);
                logger.debug(count);
                if (count) {
                    await msg.say(`${msg.author.username} unreps ${discord_user.displayName}`);
                }
                else {
                    await msg.say(`${discord_user.displayName} not repped.`);
                }
            }
            else {
                await msg.say(`Cannot unrep yourself.`);
            }
        }
    }
};
