const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, getInhouse, isMessageFromAnyInhouseAdmin,
} = require('../../lib/ihlManager');
const {
    findUser,
} = require('../../lib/db');

/**
 * @class LobbyInviteCommand
 * @extends external:Command
 */
module.exports = class LobbyInviteCommand extends Command {
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
        });
    }

    hasPermission(msg) {
        return isMessageFromAnyInhouseAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { member }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);

        if (lobbyState) {
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
        else {
            await msg.say('Not in a lobby channel.');
        }
    }
};
