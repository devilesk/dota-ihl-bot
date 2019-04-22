const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Ihl = require('../../lib/ihl');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

/**
 * @class QueueStatusCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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
                    default: '',
                },
            ],
        }, { lobbyState: false });
    }

    static async getQueueNames(guild, lobbyState) {
        const queuers = await Lobby.getActiveQueuers()(lobbyState);
        return queuers.map((queuer) => {
            const discordUser = guild.member(queuer.discordId);
            if (discordUser) {
                return discordUser.displayName;
            }
            return queuer.nickname ? queuer.nickname : 'unknown';
        });
    }

    static async getQueueStatusMessage(guild, lobbyState) {
        const userNames = await QueueStatusCommand.getQueueNames(guild, lobbyState);
        if (userNames.length) {
            return `${userNames.length} queueing for ${lobbyState.lobbyName}: ${userNames.join(', ')}.`;
        }
        return `0 queueing for ${lobbyState.lobbyName}.`;
    }

    async onMsg({ msg, guild, inhouseState, lobbyState }, { channel }) {
        if (channel) {
            // use lobbyState for given channel
            const lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
            const _lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
            if (_lobbyState) {
                const message = await QueueStatusCommand.getQueueStatusMessage(guild, _lobbyState);
                return msg.say(message);
            }
            return msg.say('Invalid lobby channel.');
        }
        if (lobbyState) {
            const message = await QueueStatusCommand.getQueueStatusMessage(guild, lobbyState);
            return msg.say(message);
        }
        const lobbyStates = await Ihl.getAllLobbyQueues(inhouseState);
        for (const _lobbyState of lobbyStates) {
            const message = await QueueStatusCommand.getQueueStatusMessage(guild, _lobbyState);
            await msg.say(message);
        }
        return null;
    }
};
