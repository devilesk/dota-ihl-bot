const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class DireCommand
 * @extends IHLCommand
 */
module.exports = class DireCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'dire',
            group: 'ihl',
            memberName: 'dire',
            guildOnly: true,
            description: 'Select dire side.',
        });
    }

    async onMsg({ msg, guild, lobbyState, inhouseUser }) {
        logger.debug('DireCommand');
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain)) {
            logger.debug(`DireCommand isCaptain ${captain.id}`);
            await this.ihlManager[CONSTANTS.EVENT_SELECTION_SIDE](lobbyState, captain, 2);
        }
    }
};
