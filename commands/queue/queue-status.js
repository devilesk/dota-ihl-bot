const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromInhouse,
    parseMessage,
    getLobbyByChannelId,
} = require('../../lib/ihlManager');
const {
    getActiveQueuers,
} = require('../../lib/lobby');
const {
    findAllActiveQueues,
    getLobby,
} = require('../../lib/db');

/**
 * @class QueueStatusCommand
 * @extends external:Command
 */
module.exports = class QueueStatusCommand extends Command {
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
    
    hasPermission(msg) {
        return isMessageFromInhouse(ihlManager.inhouseStates, msg);
    }

    async run(msg, { channel }) {
        let { user, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);

        if (user) {
            if (channel) {
                lobbyState = getLobbyByChannelId(ihlManager.inhouseStates, msg.guild.id, channel.id);
                if (lobbyState) {
                    const message = await QueueStatusCommand.getQueueStatusMessage(msg.guild, lobbyState);
                    await msg.say(message);
                }
                else {
                    await msg.say('Invalid lobby channel.');
                }
            }
            else if (lobbyState) {
                const message = await QueueStatusCommand.getQueueStatusMessage(msg.guild, lobbyState);
                await msg.say(message);
            }
            else {
                const queues = await findAllEnabledQueues(inhouseState.guild.id);
                for (queue of queues) {
                    await lobby = queue.getLobby();
                    await lobbyState = getLobby(lobby);
                    const message = await QueueStatusCommand.getQueueStatusMessage(msg.guild, lobbyState);
                    await msg.say(message);
                }
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
