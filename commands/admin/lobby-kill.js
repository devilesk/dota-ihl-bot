const { Command } = require('discord.js-commando');
const {
    ihlManager,
    getLobbyFromMessage,
    isMessageFromAnyInhouseAdmin,
} = require('../../lib/ihlManager');

/**
 * @class LobbyKillCommand
 * @extends external:Command
 */
module.exports = class LobbyKillCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-kill',
            aliases: ['lobby-destroy'],
            group: 'admin',
            memberName: 'lobby-kill',
            guildOnly: true,
            description: 'Kill a lobby.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAnyInhouseAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const [lobbyState, inhouseState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        
        if (lobbyState) {
            ihlManager.emit(CONSTANTS.EVENT_LOBBY_KILL, lobbyState, inhouseState);
        }
        else {
            await msg.say('Not in a lobby channel.').catch(console.error);
        }
    }
};
