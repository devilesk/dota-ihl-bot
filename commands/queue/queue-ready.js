const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class QueueReadyCommand
 * @extends IHLCommand
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

    async onMsg({ msg, lobbyState, inhouseUser }) {
        this.ihlManager.emit(CONSTANTS.EVENT_PLAYER_READY, lobbyState, inhouseUser);
    }
};
