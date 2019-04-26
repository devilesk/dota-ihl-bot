const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyStartCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class LobbyStartCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-start',
            aliases: ['start-lobby'],
            group: 'admin',
            memberName: 'lobby-start',
            guildOnly: true,
            description: 'Start a lobby.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, lobbyState }) {
        logger.silly('LobbyStartCommand');
        if (lobbyState.state === CONSTANTS.STATE_WAITING_FOR_PLAYERS) {
            await msg.say('Starting lobby...');
            const _lobbyState = await this.ihlManager[CONSTANTS.EVENT_LOBBY_START](lobbyState);
            if (_lobbyState.state !== CONSTANTS.STATE_MATCH_IN_PROGRESS) {
                return msg.say('Lobby not started.');
            }
            return null;
        }
        return msg.say('Lobby must be in waiting for players state before starting.');
    }
};
