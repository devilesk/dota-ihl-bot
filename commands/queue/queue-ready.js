const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class QueueReadyCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class QueueReadyCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'queue-ready',
            aliases: ['qready', 'ready'],
            group: 'queue',
            memberName: 'queue-ready',
            guildOnly: true,
            description: 'Queue ready check acknowledgement.',
        });
    }

    async onMsg({ lobbyState, inhouseUser }) {
        await this.ihlManager[CONSTANTS.EVENT_PLAYER_READY](lobbyState, inhouseUser);
    }
};
