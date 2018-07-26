const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage,
} = require('../../lib/ihlManager');
const {
    findUserByDiscordId,
} = require('../../lib/db');
const {
    isCaptain, getPlayerByDiscordId, getDraftingFaction, isPlayerDraftable,
} = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class PickCommand
 * @extends external:Command
 */
module.exports = class PickCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'pick',
            aliases: ['draft'],
            group: 'ihl',
            memberName: 'pick',
            guildOnly: true,
            description: 'Player draft command.',
            examples: ['pick @Ari*', 'pick Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player mention.',
                    type: 'member',
                },
            ],
        });
    }

    async run(msg, { member }) {
        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        if (lobbyState) {
            const captain = await getPlayerByDiscordId(lobbyState)(msg.author.id);
            const faction = await getDraftingFaction(lobbyState);
            if (isCaptain(lobbyState)(captain) && captain.faction === faction) {
                const player = await getPlayerByDiscordId(lobbyState)(member.id);
                if (player) {
                    const result = await isPlayerDraftable(lobbyState)(player);
                    switch (result) {
                    case CONSTANTS.INVALID_DRAFT_CAPTAIN:
                        ihlManager.emit(CONSTANTS.EVENT_INVALID_DRAFT_CAPTAIN, lobbyState);
                        break;
                    case CONSTANTS.INVALID_DRAFT_PLAYER:
                        ihlManager.emit(CONSTANTS.EVENT_INVALID_DRAFT_PLAYER, lobbyState);
                        break;
                    case CONSTANTS.PLAYER_DRAFT:
                        ihlManager.emit(CONSTANTS.EVENT_PICK_PLAYER, lobbyState, player, faction);
                        ihlManager.emit(CONSTANTS.EVENT_PLAYER_DRAFTED, lobbyState, msg.author, member);
                        break;
                    default:
                        break;
                    }
                }
                else {
                    ihlManager.emit(CONSTANTS.EVENT_INVALID_PLAYER_NOT_FOUND, lobbyState);
                }
            }
        }
    }
};
