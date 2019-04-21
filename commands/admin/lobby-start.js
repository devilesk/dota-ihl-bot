const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyStartCommand
 * @extends IHLCommand
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
            const started = await this.ihlManager[CONSTANTS.EVENT_LOBBY_START](lobbyState);
            return msg.say(started ? 'Lobby started.' : 'Lobby not started.');
        }
        return msg.say('Lobby must be in waiting for players state before starting.');
    }
};
