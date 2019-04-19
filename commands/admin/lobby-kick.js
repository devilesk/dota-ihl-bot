const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Db = require('../../lib/db');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyKickCommand
 * @extends IHLCommand
 */
module.exports = class LobbyKickCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-kick',
            group: 'admin',
            memberName: 'lobby-kick',
            guildOnly: true,
            description: 'Kick a user from a lobby.',
            examples: ['lobby-kick @devilesk'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a user to kick.',
                    type: 'member',
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, guild, lobbyState }, { member }) {
        const user = await Db.findUserByDiscordId(guild.id)(member.id);
        if (user) {
            await member.removeRole(lobbyState.role);
            await this.ihlManager[CONSTANTS.EVENT_LOBBY_KICK](lobbyState, user);
            await msg.say('User kicked from lobby.');
        }
        else {
            await msg.say('User not found. (Has user registered with `!register`?)');
        }

    }
};
