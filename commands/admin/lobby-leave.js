const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyLeaveCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class LobbyLeaveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-leave',
            aliases: ['leave-lobby'],
            group: 'admin',
            memberName: 'lobby-leave',
            guildOnly: true,
            description: 'Leave a lobby.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, lobbyState }) {
        logger.silly('LobbyLeaveCommand');
        if (lobbyState.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS) {
            await msg.say('Leaving lobby...');
            const err = await this.ihlManager[CONSTANTS.EVENT_LOBBY_LEAVE](lobbyState);
            return msg.say(!err ? 'Bot left lobby.' : `Bot failed to leave lobby. Reason: ${err}`);
        }
        return msg.say('Lobby must be in waiting for players state before bot can leave.');
    }
};
