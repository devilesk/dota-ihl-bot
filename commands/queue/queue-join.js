const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');
const toHHMMSS = require('../../lib/util/toHHMMSS');

/**
 * @class QueueJoinCommand
 * @extends IHLCommand
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
        }, {
            lobbyState: false,
        });
    }
    
    async processResult(guild, lobbyState, inhouseUser, result, msg) {
        switch (result) {
        case CONSTANTS.QUEUE_JOINED:
            await Lobby.getQueuers()(lobbyState).then(queuers => msg.say(`${msg.member.displayName} joined queue. ${queuers.length} in queue.`))
            break;
        case CONSTANTS.QUEUE_ALREADY_JOINED:
            await msg.say(`${msg.member.displayName} already in queue or game.`);
            break;
        case CONSTANTS.QUEUE_BANNED:
            await msg.say(`${msg.member.displayName} banned from queuing. Remaining time: ${toHHMMSS((inhouseUser.queue_timeout - Date.now()) / 1000)}.`);
            break;
        default:
            break;
        }
    }

    async onMsg({ msg, guild, inhouseState, lobbyState, inhouseUser }, { channel }) {
        logger.debug(`QueueJoinCommand lobbyState ${lobbyState}`);
        if (inhouseUser.rank_tier) {
            if (channel) {
                // use lobbyState for given channel
                lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
                lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
                if (lobbyState) {
                    logger.debug('QueueJoinCommand channel found... joining queue');
                    const result = await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser, msg.member);
                    await this.processResult(guild, lobbyState, inhouseUser, result, msg);
                }
                else {
                    await msg.say('Invalid lobby channel.');
                }
            }
            else if (lobbyState) {
                logger.debug('QueueJoinCommand lobby found... joining queue');
                const result = await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser, msg.member);
                await this.processResult(guild, lobbyState, inhouseUser, result, msg);
            }
            else {
                logger.debug('QueueJoinCommand joining all queues');
                await this.ihlManager.joinAllLobbyQueues(inhouseState, inhouseUser, msg.member);
                await msg.say(`${msg.member.displayName} joined all queues.`);
            }
        }
        else {
            await msg.say('Badge rank not set. Ping an admin to have them set it for you.');
        }
    }
};
