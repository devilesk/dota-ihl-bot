const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, getInhouse, isMessageFromAdmin,
} = require('../../lib/ihlManager');

module.exports = class LobbyKillCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-kill',
            aliases: ['lobby-destroy'],
            group: 'admin',
            memberName: 'lobby-kill',
            guildOnly: true,
            description: 'Kill a lobby.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const lobby = getLobbyFromMessage(ihlManager.inhouseStates, msg);

        if (lobby) {
            // TODO: FIX
            lobby.kill().then(ihlManager.removeLobby).catch(console.error);
        }
        else {
            await msg.say('Not in a lobby channel.');
        }
    }
};
