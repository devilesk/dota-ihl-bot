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
 * @class QueueLeaveCommand
 * @extends external:Command
 */
module.exports = class QueueLeaveCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'queue-leave',
            aliases: ['qleave', 'leave', 'leave-queue'],
            group: 'queue',
            memberName: 'queue-leave',
            guildOnly: true,
            description: 'Leave inhouse queue.',
            examples: ['queue-leave', 'queueleave', 'qleave', 'leave'],
        });
    }
    
    hasPermission(msg) {
        return isMessageFromInhouse(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        let { user, lobbyState, inhouseState } = await parseMessage(ihlManager.inhouseStates, msg);
        if (user) {
            if (channel) {
                lobbyState = getLobbyByChannelId(ihlManager.inhouseStates, msg.guild.id, channel.id);
                if (lobbyState) {
                    await ihlManager.leaveLobbyQueue(lobbyState, user);
                }
                else {
                    await msg.say('Invalid lobby channel.');
                }
            }
            else if (lobbyState) {
                await ihlManager.leaveLobbyQueue(lobbyState, user);
            }
            else {
                await ihlManager.leaveAllQueues(inhouseState, user);
            }
        }
        else {
            await msg.say('User not found. (Have you registered your steam id with `!register`?)');
        }
    }
};
