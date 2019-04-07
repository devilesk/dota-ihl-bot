const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

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

    async onMsg({ msg, guild, inhouseState, lobbyState, inhouseUser }, { channel }) {
        logger.debug(`QueueJoinCommand lobbyState ${lobbyState}`);
        if (inhouseUser.rank_tier) {
            if (channel) {
                // use lobbyState for given channel
                lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
                lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
                if (lobbyState) {
                    logger.debug('QueueJoinCommand channel found... joining queue');
                    await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser, msg.author);
                }
                else {
                    await msg.say('Invalid lobby channel.');
                }
            }
            else if (lobbyState) {
                logger.debug('QueueJoinCommand lobby found... joining queue');
                await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser, msg.author);
            }
            else {
                logger.debug('QueueJoinCommand joining all queues');
                await this.ihlManager.joinAllLobbyQueues(inhouseState, inhouseUser, msg.author);
            }
        }
        else {
            await msg.say('Badge rank not set. Ping an admin to have them set it for you.');
        }
    }
};
