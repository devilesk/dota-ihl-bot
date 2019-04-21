const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyKickCommand
 * @extends IHLCommand
 */
module.exports = class LobbyKickCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-kick',
            group: 'admin',
            memberName: 'lobby-kick',
            guildOnly: true,
            description: 'Kick a user from a lobby.',
            examples: ['lobby-kick @devilesk'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to kick.',
                    type: 'string',
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
        const [user, discordUser] = await findUser(guild)(member);
        if (user) {
            await member.removeRole(lobbyState.role);
            await this.ihlManager[CONSTANTS.EVENT_LOBBY_KICK](lobbyState, user);
            return msg.say(`${discordUser.displayName} kicked from lobby.`);
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
