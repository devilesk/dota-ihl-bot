const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const Lobby = require('../../lib/lobby');
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
                    type: 'string',
                },
            ],
        });
    }

    async onMsg({ msg, guild, lobbyState, inhouseUser }, { member }) {
        logger.silly('PickCommand');
        const [user, discordUser] = await findUser(guild)(member);
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain) && user) {
            logger.silly(`PickCommand isCaptain ${captain.id}`);
            const result = await this.ihlManager[CONSTANTS.EVENT_PICK_PLAYER](lobbyState, captain, user);
            switch (result) {
            case CONSTANTS.INVALID_DRAFT_CAPTAIN:
                await msg.say('Cannot draft a captain.');
                break;
            case CONSTANTS.INVALID_DRAFT_PLAYER:
                await msg.say('Player already drafted.');
                break;
            case CONSTANTS.PLAYER_DRAFTED:
                await msg.say(`${guild.member(user.discord_id)} drafted by ${guild.member(captain.discord_id)}`);
                break;
            case CONSTANTS.INVALID_PLAYER_NOT_FOUND:
                await msg.say(`${discordUser.displayName} not found.`);
                break;
            default:
                break;
            }
        }
    }
};
