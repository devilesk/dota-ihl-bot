const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

/**
 * @class QueueLeaveCommand
 * @extends IHLCommand
 */
module.exports = class QueueLeaveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-leave',
            aliases: ['qleave', 'leave', 'leave-queue'],
            group: 'queue',
            memberName: 'queue-leave',
            guildOnly: true,
            description: 'Leave inhouse queue.',
            examples: ['queue-leave', 'queueleave', 'qleave', 'leave'],
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
        if (channel) {
            // use lobbyState for given channel
            const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
            lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
            if (lobbyState) {
                const inQueue = await this.ihlManager.leaveLobbyQueue(lobbyState, inhouseUser, msg.member);
                if (inQueue) {
                    await Lobby.getQueuers()(lobbyState).then(queuers => msg.say(`${msg.member.displayName} left queue. ${queuers.length} in queue.`));
                }
                else {
                    await msg.say(`${msg.member.displayName} not in queue.`);
                }
            }
            else {
                await msg.say('Invalid lobby channel.');
            }
        }
        else if (lobbyState) {
            const inQueue = await this.ihlManager.leaveLobbyQueue(lobbyState, inhouseUser, msg.member);
            if (inQueue) {
                await Lobby.getQueuers()(lobbyState).then(queuers => msg.say(`${msg.member.displayName} left queue. ${queuers.length} in queue.`));
            }
            else {
                await msg.say(`${msg.member.displayName} not in queue.`);
            }
        }
        else {
            await this.ihlManager.leaveAllLobbyQueues(inhouseState, inhouseUser, msg.member);
            await msg.say(`${msg.member.displayName} left all queues.`);
        }
    }
};
