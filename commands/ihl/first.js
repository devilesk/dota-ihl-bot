const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
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

    async onMsg({ msg, guild, lobbyState, inhouseUser }) {
        logger.debug('FirstCommand');
        const captain = inhouseUser;
        if (Lobby.isCaptain(lobbyState)(captain)) {
            logger.debug(`FirstCommand isCaptain ${captain.id}`);
            await this.ihlManager[CONSTANTS.EVENT_SELECTION_PICK](lobbyState, captain, 1);
        }
    }
};
