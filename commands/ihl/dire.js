const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class DireCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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

    async onMsg({ lobbyState, inhouseUser }) {
        logger.silly('DireCommand');
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain)) {
            logger.silly(`DireCommand isCaptain ${captain.id}`);
            await this.ihlManager[CONSTANTS.EVENT_SELECTION_SIDE](lobbyState, captain, 2);
        }
    }
};
