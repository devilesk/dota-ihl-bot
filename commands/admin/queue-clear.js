const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const Lobby = require('../../lib/lobby');

/**
 * @class QueueClearCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class QueueClearCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-clear',
            aliases: ['qclear', 'clear'],
            group: 'admin',
            memberName: 'queue-clear',
            guildOnly: true,
            description: 'Clear inhouse queue.',
            examples: ['queue-clear', 'queueclear', 'qclear', 'clear'],
            args: [
                {
                    key: 'channel',
                    prompt: 'Provide a channel.',
                    type: 'channel',
                    default: '',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, inhouseState, lobbyState }, { channel }) {
        if (channel) {
            // use lobbyState for given channel
            const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
            const _lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
            if (_lobbyState) {
                logger.silly('QueueClearCommand channel found... clearing queue');
                await this.ihlManager.clearLobbyQueue(_lobbyState);
                return msg.say('Queue cleared.');
            }
            return msg.say('Invalid lobby channel.');
        }
        if (lobbyState) {
            logger.silly('QueueClearCommand lobby found... clearing queue');
            await this.ihlManager.clearLobbyQueue(lobbyState);
            return msg.say('Queue cleared.');
        }
        logger.silly('QueueClearCommand clearing all queues');
        await this.ihlManager.clearAllLobbyQueues(inhouseState);
        return msg.say('All queues cleared.');
    }
};
