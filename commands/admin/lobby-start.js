const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class LobbyStartCommand
 * @extends IHLCommand
 */
module.exports = class LobbyStartCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-start',
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
        // TODO: FIX
        lobbyState.start().then(() => msg.say('Lobby started.')).catch(console.error);
    }
};
