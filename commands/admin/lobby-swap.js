const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, isMessageFromAdmin,
} = require('../../lib/ihlManager');

/**
 * @class LobbySwapCommand
 * @extends external:Command
 */
module.exports = class LobbySwapCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-swap',
            aliases: ['lobby-flip', 'flip', 'swap'],
            group: 'admin',
            memberName: 'lobby-swap',
            guildOnly: true,
            description: 'Swap lobby teams.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        
        if (lobbyState) {
            ihlManager.emit(CONSTANTS.EVENT_LOBBY_SWAP_TEAMS, lobbyState);
            await msg.say('Teams swapped.');
        }
        else {
            await msg.say('Not in a lobby channel.').catch(console.error);
        }
    }
};
