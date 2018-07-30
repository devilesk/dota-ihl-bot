const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, getInhouse, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const {
    forceLobbyDraft,
} = require('../../lib/lobby');
const {
    findUser,
} = require('../../lib/db');

/**
 * @class LobbyDraftCommand
 * @extends external:Command
 */
module.exports = class LobbyDraftCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-draft',
            group: 'admin',
            memberName: 'lobby-draft',
            guildOnly: true,
            description: 'Force a lobby to do a player draft with assigned captains.',
            examples: ['lobby-draft @devilesk @Ari-'],
            args: [
                {
                    key: 'captain_1',
                    prompt: 'Provide a captain.',
                    type: 'member',
                },
                {
                    key: 'captain_2',
                    prompt: 'Provide a captain.',
                    type: 'member',
                },
            ],
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { captain_1, captain_2 }) {
        const discord_id = msg.author.id;
        const guild = msg.channel.guild;
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);

        if (lobbyState) {
            const [captain_1, discord_user_1, result_type_1] = await findUser(guild)(captain_1);
            const [captain_2, discord_user_2, result_type_2] = await findUser(guild)(captain_2);
            if (captain_1_user && captain_2_user) {
                ihlManager.emit(CONSTANTS.EVENT_FORCE_LOBBY_DRAFT, lobbyState, captain_1, captain_2);
                await msg.say('Lobby set to player draft.');
            }
            else {
                await msg.say('Captain not found. (Has user registered with `!register`?)');
            }
        }
        else {
            await msg.say('Not in a lobby channel.');
        }
    }
};
