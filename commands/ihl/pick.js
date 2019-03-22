const IHLCommand = require('../../lib/ihlCommand');
const {
    isCaptain,
    getPlayerByDiscordId,
    getDraftingFaction,
    isPlayerDraftable,
} = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class PickCommand
 * @extends IHLCommand
 */
module.exports = class PickCommand extends IHLCommand {
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

    async onMsg({ msg, lobbyState, inhouseUser }, { member }) {
        const captain = await getPlayerByDiscordId(lobbyState)(inhouseUser.discord_id);
        const faction = await getDraftingFaction(lobbyState);
        if (isCaptain(lobbyState)(captain) && captain.faction === faction) {
            const player = await getPlayerByDiscordId(lobbyState)(member.id);
            if (player) {
                const result = await isPlayerDraftable(lobbyState)(player);
                switch (result) {
                case CONSTANTS.INVALID_DRAFT_CAPTAIN:
                    this.ihlManager.emit(CONSTANTS.MSG_INVALID_DRAFT_CAPTAIN, lobbyState);
                    break;
                case CONSTANTS.INVALID_DRAFT_PLAYER:
                    this.ihlManager.emit(CONSTANTS.MSG_INVALID_DRAFT_PLAYER, lobbyState);
                    break;
                case CONSTANTS.PLAYER_DRAFT:
                    this.ihlManager.emit(CONSTANTS.EVENT_PICK_PLAYER, lobbyState, player, faction);
                    this.ihlManager.emit(CONSTANTS.MSG_PLAYER_DRAFTED, lobbyState, msg.author, member);
                    break;
                default:
                    break;
                }
            }
            else {
                this.ihlManager.emit(CONSTANTS.MSG_INVALID_PLAYER_NOT_FOUND, lobbyState);
            }
        }

    }
};
