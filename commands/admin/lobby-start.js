const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, getInhouse, isMessageFromAdmin,
} = require('../../lib/ihlManager');

module.exports = class LobbyStartCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-start',
            group: 'admin',
            memberName: 'lobby-start',
            guildOnly: true,
            description: 'Start a lobby.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);

        if (lobbyState) {
            // TODO: FIX
            lobbyState.start().then(() => msg.say('Lobby started.')).catch(console.error);
        }
        else {
            await msg.say('Not in a lobby channel.');
        }
    }
};
