const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class SecondCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class SecondCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'second',
            aliases: ['2nd', 'second-pick', 'pick-second'],
            group: 'ihl',
            memberName: 'second',
            guildOnly: true,
            description: 'Select second pick.',
        });
    }

    async onMsg({ lobbyState, inhouseUser }) {
        logger.silly('SecondCommand');
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain)) {
            logger.silly(`SecondCommand isCaptain ${captain.id}`);
            await this.ihlManager[CONSTANTS.EVENT_SELECTION_PICK](lobbyState, captain, 2);
        }
    }
};
