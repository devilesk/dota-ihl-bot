const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const {
    findUser,
} = require('../../lib/ihlManager');
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
                    key: 'captain_1',
                    prompt: 'Provide a captain.',
                    type: 'string',
                },
                {
                    key: 'captain_2',
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

    async onMsg({ msg, guild, lobbyState }, { captain_1, captain_2 }) {
        const [captain_1_user, discord_user_1, result_type_1] = await findUser(guild)(captain_1);
        const [captain_2_user, discord_user_2, result_type_2] = await findUser(guild)(captain_2);
        if (captain_1_user && captain_2_user) {
            await this.ihlManager[CONSTANTS.EVENT_FORCE_LOBBY_DRAFT](lobbyState, captain_1, captain_2);
            await msg.say('Lobby set to player draft.');
        }
        else {
            await msg.say('Captain not found. (Has user registered with `!register`?)');
        }
    }
};
