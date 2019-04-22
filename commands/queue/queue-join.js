const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');
const toHHMMSS = require('../../lib/util/toHHMMSS');
const util = require('util');
/**
 * @class QueueJoinCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class QueueJoinCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-join',
            aliases: ['qjoin', 'join', 'join-queue'],
            group: 'queue',
            memberName: 'queue-join',
            guildOnly: true,
            description: 'Join inhouse queue.',
            examples: ['queue-join', 'queuejoin', 'qjoin', 'join'],
            args: [
                {
                    key: 'channel',
                    prompt: 'Provide a channel.',
                    type: 'channel',
                    default: '',
                },
            ],
        }, { lobbyState: false });
    }

    static async processResult(lobbyState, inhouseUser, result, msg) {
        switch (result) {
        case CONSTANTS.QUEUE_JOINED:
            return Lobby.getQueuers()(lobbyState).then(queuers => msg.say(`${msg.member.displayName} joined queue. ${queuers.length} in queue.`));
        case CONSTANTS.QUEUE_ALREADY_JOINED:
            return msg.say(`${msg.member.displayName} already in queue or game.`);
        case CONSTANTS.QUEUE_LOBBY_INVALID_STATE:
            return msg.say(`${msg.member.displayName} cannot queue for this lobby.`);
        case CONSTANTS.QUEUE_BANNED:
            return msg.say(`${msg.member.displayName} banned from queuing. Remaining time: ${toHHMMSS((inhouseUser.queueTimeout - Date.now()) / 1000)}.`);
        default:
            return null;
        }
    }

    async onMsg({ msg, guild, inhouseState, lobbyState, inhouseUser }, { channel }) {
        logger.silly(`QueueJoinCommand lobbyState ${lobbyState}`);
        if (inhouseUser.rankTier) {
            if (channel) {
                // use lobbyState for given channel
                const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
                const _lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
                if (_lobbyState) {
                    logger.silly('QueueJoinCommand channel found... joining queue');
                    const result = await this.ihlManager.joinLobbyQueue(_lobbyState, inhouseUser, msg.member);
                    return QueueJoinCommand.processResult(_lobbyState, inhouseUser, result, msg);
                }
                return msg.say('Invalid lobby channel.');
            }
            if (lobbyState) {
                logger.silly('QueueJoinCommand lobby found... joining queue');
                const result = await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser, msg.member);
                return QueueJoinCommand.processResult(lobbyState, inhouseUser, result, msg);
            }
            logger.silly('QueueJoinCommand joining all queues');
            await this.ihlManager.joinAllLobbyQueues(inhouseState, inhouseUser, msg.member);
            return msg.say(`${msg.member.displayName} joined all queues.`);
        }
        return msg.say('Badge rank not set. Ping an admin to have them set it for you.');
    }
};
