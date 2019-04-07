const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
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
        logger.debug('PickCommand');
        const [user, discord_user, result_type] = await findUser(guild)(member);
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain) && user) {
            logger.debug(`PickCommand isCaptain ${captain.id}`);
            this.ihlManager.emit(CONSTANTS.EVENT_PICK_PLAYER, lobbyState, captain, user, discord_user);
        }
    }
};
