const IHLCommand = require('../../lib/ihlCommand');
const {
    getLobbyFromInhouseByChannelId,
} = require('../../lib/ihl');

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

    async onMsg({ msg, inhouseState, lobbyState, inhouseUser }, { channel }) {
        if (channel) {
            lobbyState = getLobbyFromInhouseByChannelId(inhouseState, channel.id);
            if (lobbyState) {
                await this.ihlManager.leaveLobbyQueue(lobbyState, inhouseUser);
            }
            else {
                await msg.say('Invalid lobby channel.');
            }
        }
        else if (lobbyState) {
            await this.ihlManager.leaveLobbyQueue(lobbyState, inhouseUser);
        }
        else {
            await this.ihlManager.leaveAllQueues(inhouseState, inhouseUser);
        }

    }
};
