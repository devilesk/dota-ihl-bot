const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const { findUser } = require('../../lib/ihlManager');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyDraftCommand
 * @extends IHLCommand
 */
module.exports = class LobbyDraftCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-draft',
            group: 'admin',
            memberName: 'lobby-draft',
            guildOnly: true,
            description: 'Force a lobby to do a player draft with assigned captains.',
            examples: ['lobby-draft @devilesk @Ari-'],
            args: [
                {
                    key: 'captain1',
                    prompt: 'Provide a captain.',
                    type: 'string',
                },
                {
                    key: 'captain2',
                    prompt: 'Provide a captain.',
                    type: 'string',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, lobbyState }, { captain1, captain2 }) {
        logger.debug('LobbyDraftCommand');
        const [captain1User] = await findUser(guild)(captain1);
        const [captain2User] = await findUser(guild)(captain2);
        if (captain1User && captain2User) {
            await this.ihlManager[CONSTANTS.EVENT_LOBBY_FORCE_DRAFT](lobbyState, captain1, captain2);
            return msg.say('Lobby set to player draft.');
        }
        return msg.say(IHLCommand.UserNotFoundMessage);
    }
};
