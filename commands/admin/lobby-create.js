const { Command } = require('discord.js-commando');
const { ihlManager, getInhouse, isMessageFromAnyInhouseAdmin } = require('../../lib/ihlManager');

/**
 * @class LobbyCreateCommand
 * @extends external:Command
 */
module.exports = class LobbyCreateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-create',
            group: 'admin',
            memberName: 'lobby-create',
            guildOnly: true,
            description: 'Create a lobby.',
        });
    }

    hasPermission(msg) {
        return isMessageFromAnyInhouseAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const inhouse = getInhouse(ihlManager.inhouseStates, guild);

        // TODO: FIX
        ihlManager.createLobby(guild).then(lobby => lobby.setupLobbyBot()).catch(console.error);
    }
};
