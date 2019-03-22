const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
    findOrCreateLeague,
    findOrCreateReputation,
} = require('../../lib/db');

/**
 * @class RepCommand
 * @extends IHLCommand
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
        });
    }

    async onMsg({ msg, guild, inhouseUser }, { member }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        if (user && fromUser) {
            if (user.id !== fromUser.id) {
                const league = await findOrCreateLeague(guild.id);
                const [rep, created] = await findOrCreateReputation(league)(fromUser)(user);
                logger.debug(rep);
                logger.debug(created);
                if (created) {
                    await msg.say(`${msg.author.username} reps ${discord_user.displayName}`);
                }
                else {
                    await msg.say(`${discord_user.displayName} already repped.`);
                }
            }
            else {
                await msg.say(`Cannot rep yourself.`);
            }
        }
    }
};
