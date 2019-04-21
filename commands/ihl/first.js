const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Lobby = require('../../lib/lobby');
const CONSTANTS = require('../../lib/constants');

/**
 * @class FirstCommand
 * @extends IHLCommand
 */
module.exports = class FirstCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'first',
            aliases: ['1st', 'first-pick', 'pick-first'],
            group: 'ihl',
            memberName: 'first',
            guildOnly: true,
            description: 'Select first pick.',
        });
    }

    async onMsg({ lobbyState, inhouseUser }) {
        logger.silly('FirstCommand');
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain)) {
            logger.silly(`FirstCommand isCaptain ${captain.id}`);
            await this.ihlManager[CONSTANTS.EVENT_SELECTION_PICK](lobbyState, captain, 1);
        }
    }
};
