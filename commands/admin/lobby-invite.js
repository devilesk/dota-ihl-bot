const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Guild = require('../../lib/guild');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyInviteCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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
        logger.silly('LobbyInviteCommand');
        const [user, discordUser] = await findUser(guild)(member);
        if (user) {
            await this.ihlManager[CONSTANTS.EVENT_LOBBY_INVITE](lobbyState, user);
            await Guild.addRoleToUser(guild)(lobbyState.role)(discordUser);
            return msg.say(`${discordUser.displayName} invited to lobby.`);
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
