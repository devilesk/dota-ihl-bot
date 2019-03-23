const IHLCommand = require('../../lib/ihlCommand');
const {
    lobbyToLobbyState,
} = require('./lobby');
const {
    findLobbyByDiscordChannel,
} = require('./db');
const {
    findOrCreateChannelInCategory,
    makeRole,
} = require('./guild');

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
        if (inhouseUser.rank_tier) {
            if (channel) {
                // use lobbyState for given channel
                lobby = inhouseState ? await findLobbyByDiscordChannel(guild.id)(channel.id) : null;
                lobbyState = lobby ? await lobbyToLobbyState(inhouseState)({ findOrCreateChannelInCategory, makeRole })(lobby) : null;
                if (lobbyState) {
                    await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser);
                }
                else {
                    await msg.say('Invalid lobby channel.');
                }
            }
            else if (lobbyState) {
                await this.ihlManager.joinLobbyQueue(lobbyState, inhouseUser);
            }
            else {
                await this.ihlManager.joinAllQueues(inhouseState, inhouseUser);
            }
        }
        else {
            await msg.say('Badge rank not set. Ping an admin to have them set it for you.');
        }
    }
};
