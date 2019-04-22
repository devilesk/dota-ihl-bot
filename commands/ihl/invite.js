const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class InviteCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class InviteCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'invite',
            group: 'ihl',
            memberName: 'invite',
            guildOnly: true,
            description: 'Request a lobby invite.',
        });
    }

    async onMsg({ msg, lobbyState, inhouseUser }) {
        logger.debug('InviteCommand');
        await this.ihlManager[CONSTANTS.EVENT_LOBBY_INVITE](lobbyState, inhouseUser);
        return msg.say(`Lobby invite sent to ${msg.member.displayName}.`);
    }
};
