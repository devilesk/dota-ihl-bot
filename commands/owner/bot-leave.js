const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class BotLeaveCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class BotLeaveCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-leave',
            group: 'owner',
            memberName: 'bot-leave',
            description: 'Manually tell bot to leave lobby.',
            examples: ['bot-leave 76561197960287930'],
            args: [
                {
                    key: 'steamId64',
                    prompt: 'Provide a bot steam id.',
                    type: 'string',
                },
            ],
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }, { steamId64 }) {
        await msg.say(`Loading bot ${steamId64}...`);
        const dotaBot = await this.ihlManager.loadBotBySteamId(steamId64);
        await msg.say(`Bot ${steamId64} loaded.`);
        await dotaBot.leavePracticeLobby();
        await dotaBot.abandonCurrentGame();
        await dotaBot.leaveLobbyChat();
        return msg.say(`Bot ${steamId64} left lobby.`);
    }
};
