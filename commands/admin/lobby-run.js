const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyRunCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class LobbyRunCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-run',
            aliases: ['lobby-process', 'run-lobby', 'process-lobby'],
            group: 'admin',
            memberName: 'lobby-run',
            guildOnly: true,
            description: 'Manually run a lobby.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, lobbyState }) {
        logger.silly(`LobbyRunCommand ${lobbyState}`);
        await msg.say('Running lobby...');
        await this.ihlManager[CONSTANTS.EVENT_RUN_LOBBY](lobbyState);
        return msg.say(`Lobby ${lobbyState.lobbyName} run.`);
    }
};
