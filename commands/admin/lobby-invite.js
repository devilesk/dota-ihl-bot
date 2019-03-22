const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/db');

/**
 * @class LobbyInviteCommand
 * @extends IHLCommand
 */
module.exports = class LobbyInviteCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-invite',
            group: 'admin',
            memberName: 'lobby-invite',
            guildOnly: true,
            description: 'Invite a user to a lobby.',
            examples: ['lobby-invite @devilesk'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to invite.',
                    type: 'member',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, lobbyState }, { member }) {
        const [user, discord_user, result_type] = await findUser(guild)(member);
        if (user) {
            await lobbyState.dotaBot.inviteToLobby(user.steamid_64);
            await user.addRole(lobbyState.role);
            await msg.say('User invited to lobby.');
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }

    }
};
