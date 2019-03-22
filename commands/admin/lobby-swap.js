const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class LobbySwapCommand
 * @extends IHLCommand
 */
module.exports = class LobbySwapCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-swap',
            aliases: ['lobby-flip', 'flip', 'swap'],
            group: 'admin',
            memberName: 'lobby-swap',
            guildOnly: true,
            description: 'Swap lobby teams.',
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }) {
        this.ihlManager.emit(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, lobbyState);
        await msg.say('Teams swapped.');
    }
};
