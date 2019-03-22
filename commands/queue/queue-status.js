const IHLCommand = require('../../lib/ihlCommand');
const {
    getLobbyFromInhouseByChannelId,
} = require('../../lib/ihl');
const {
    getActiveQueuers,
} = require('../../lib/lobby');
const {
    findAllActiveQueues,
    getLobby,
} = require('../../lib/db');

/**
 * @class QueueStatusCommand
 * @extends IHLCommand
 */
module.exports = class QueueStatusCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-status',
            aliases: ['qstatus', 'status'],
            group: 'queue',
            memberName: 'queue-status',
            guildOnly: true,
            description: 'Display players in queue.',
            examples: ['queue-status', 'queuestatus', 'qstatus', 'status'],
            args: [
                {
                    key: 'channel',
                    prompt: 'Provide a channel.',
                    type: 'channel',
                    default: null,
                },
            ],
        }, {
            lobbyState: false,
        });
    }

    static async getQueueNames(guild, lobbyState) {
        const queuers = await getActiveQueuers()(lobbyState);
        return queuers.map((queuer) => {
            const discord_user = guild.member(queuer.discord_id);
            if (discord_user) {
                return discord_user.displayName;
            }
            return queuer.nickname ? queuer.nickname : 'unknown';
        });
    }

    static async getQueueStatusMessage(guild, lobbyState) {
        const userNames = await QueueStatusCommand.getQueueNames(guild, lobbyState);
        if (userNames.length) {
            return `${userNames.length} in ${lobbyState.lobby_name} queue: ${userNames.join(', ')}`;
        }
        else {
            return '0 in ${lobbyState.lobby_name} queue.';
        }
    }

    async onMsg({ msg, guild, inhouseState, lobbyState }, { channel }) {
        if (channel) {
            lobbyState = getLobbyFromInhouseByChannelId(inhouseState, channel.id);
            if (lobbyState) {
                const message = await QueueStatusCommand.getQueueStatusMessage(guild, lobbyState);
                await msg.say(message);
            }
            else {
                await msg.say('Invalid lobby channel.');
            }
        }
        else if (lobbyState) {
            const message = await QueueStatusCommand.getQueueStatusMessage(guild, lobbyState);
            await msg.say(message);
        }
        else {
            const queues = await findAllEnabledQueues(guild.id);
            for (const queue of queues) {
                const lobbyState = await getLobby({ lobby_name: queue.queue_name });
                const message = await QueueStatusCommand.getQueueStatusMessage(guild, lobbyState);
                await msg.say(message);
            }
        }

    }
};
