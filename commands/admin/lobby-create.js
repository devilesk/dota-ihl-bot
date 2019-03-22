const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class LobbyCreateCommand
 * @extends IHLCommand
 */
module.exports = class LobbyCreateCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-create',
            group: 'admin',
            memberName: 'lobby-create',
            guildOnly: true,
            description: 'Create a lobby.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async run({ msg, guild }) {
        // TODO: FIX
        this.ihlManager.createLobby(guild).then(lobby => lobby.setupLobbyBot()).catch(console.error);
    }
};
