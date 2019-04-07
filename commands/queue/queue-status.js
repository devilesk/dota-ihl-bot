const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Ihl = require('../../lib/ihl');
const Lobby = require('../../lib/lobby');
const Db = require('../../lib/db');

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
                    default: '',
                },
            ],
        }, {
            lobbyState: false,
        });
    }

    static async getQueueNames(guild, lobbyState) {
        const queuers = await Lobby.getActiveQueuers()(lobbyState);
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
            return `${userNames.length} queueing for ${lobbyState.lobby_name}: ${userNames.join(', ')}`;
        }
        else {
            return `0 queueing for ${lobbyState.lobby_name}.`;
        }
    }

    async onMsg({ msg, guild, inhouseState, lobbyState }, { channel }) {
        if (channel) {
            // use lobbyState for given channel
            lobby = inhouseState ? await Db.findLobbyByDiscordChannel(guild.id)(channel.id) : null;
            lobbyState = lobby ? await Lobby.lobbyToLobbyState(inhouseState)(lobby) : null;
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
            const lobbyStates = await Ihl.getAllLobbyQueues(inhouseState);
            for (const lobbyState of lobbyStates) {
                const message = await QueueStatusCommand.getQueueStatusMessage(guild, lobbyState);
                await msg.say(message);
            }
        }
    }
};
