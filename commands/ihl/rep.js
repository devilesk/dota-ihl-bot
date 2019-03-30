const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
const {
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
            inhouseUserVouched: false,
        });
    }

    async onMsg({ msg, league, guild, inhouseUser }, { member }) {
        console.log(`RepCommand`);
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const fromUser = inhouseUser;
        if (user && fromUser) {
            if (user.id !== fromUser.id) {
                console.log(`RepCommand ${user.id} ${fromUser.id}`);
                const [rep, created] = await findOrCreateReputation(fromUser)(user);
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
