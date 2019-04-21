const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

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

    async onMsg({ msg, lobbyState }) {
        await msg.say('Swapping teams...');
        await this.ihlManager[CONSTANTS.EVENT_LOBBY_SWAP_TEAMS](lobbyState);
        return msg.say('Teams swapped.');
    }
};
