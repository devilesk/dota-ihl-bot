const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage,
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

    async run(msg) {
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        if (lobbyState) {
            const user = await findUserByDiscordId(lobbyState.guild.id)(msg.author.id);
            if (user) {
                ihlManager.emit(CONSTANTS.EVENT_PLAYER_READY, lobbyState, user);
            }
        }
    }
};
