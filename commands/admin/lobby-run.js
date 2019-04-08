const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyRunCommand
 * @extends IHLCommand
 */
module.exports = class LobbyRunCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-run',
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

    async run({ msg, lobbyState }) {
        await this.ihlManager[CONSTANTS.EVENT_RUN_LOBBY](lobbyState);
        await msg.say(`Lobby ${lobbyState.lobby_name} run.`);
    }
};
