const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyKillCommand
 * @extends IHLCommand
 */
module.exports = class LobbyKillCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-kill',
            aliases: ['lobby-destroy'],
            group: 'admin',
            memberName: 'lobby-kill',
            guildOnly: true,
            description: 'Kill a lobby.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, inhouseState, lobbyState }) {
        this.ihlManager.eventEmitter.emit(CONSTANTS.EVENT_LOBBY_KILL, lobbyState, inhouseState);
    }
};
