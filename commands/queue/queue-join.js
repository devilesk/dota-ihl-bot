const { Command } = require('discord.js-commando');
const {
    ihlManager,
    isMessageFromInhouse,
    parseMessage,
    getLobbyByChannelId,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
} = require('../../lib/db');

/**
 * @class QueueJoinCommand
 * @extends external:Command
 */
module.exports = class QueueJoinCommand extends Command {
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
        });
    }
    
    hasPermission(msg) {
        return isMessageFromInhouse(ihlManager.inhouseStates, msg);
    }

    async run(msg, { channel }) {
        let { user, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);
        if (user) {
            if (user.rank_tier) {
                if (channel) {
                    [lobbyState, inhouseState] = getLobbyByChannelId(ihlManager.inhouseStates, msg.guild.id, channel.id);
                    if (lobbyState) {
                        await ihlManager.joinLobbyQueue(lobbyState, user);
                    }
                    else {
                        await msg.say('Invalid lobby channel.');
                    }
                }
                else if (lobbyState) {
                    await ihlManager.joinLobbyQueue(lobbyState, user);
                }
                else {
                    await ihlManager.joinAllQueues(inhouseState, user);
                }
            }
            else {
                await msg.say('Badge rank not set. Ping an admin to have them set it for you.');
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
