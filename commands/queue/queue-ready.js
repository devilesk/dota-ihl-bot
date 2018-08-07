const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromLobby,
    parseMessage,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
} = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');

/**
 * @class QueueReadyCommand
 * @extends external:Command
 */
module.exports = class QueueReadyCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-ready',
            aliases: ['qready', 'ready'],
            group: 'queue',
            memberName: 'queue-ready',
            guildOnly: true,
            description: 'Queue ready check acknowledgement.',
        });
    }
    
    hasPermission(msg) {
        return isMessageFromLobby(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const { user, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);
        if (lobbyState && user) {
            ihlManager.emit(CONSTANTS.EVENT_PLAYER_READY, lobbyState, user);
        }
    }
};
