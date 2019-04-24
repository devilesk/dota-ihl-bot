const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class BotStatusCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class BotStatusCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'bot-status',
            group: 'owner',
            memberName: 'bot-status',
            description: 'Manually set a bot status.',
            examples: ['bot-status 76561197960287930 BOT_UNAVAILABLE', 'bot-status 76561197960287930 BOT_ONLINE', 'bot-status 76561197960287930 BOT_OFFLINE'],
            args: [
                {
                    key: 'steamId64',
                    prompt: 'Provide a bot steam id.',
                    type: 'string',
                },
                {
                    key: 'status',
                    prompt: 'Provide a status.',
                    type: 'string',
                    validate: (status) => {
                        if (status.startsWith('BOT_') && Object.prototype.hasOwnProperty.call(CONSTANTS, status)) return true;
                        return 'Value must be a valid status';
                    },
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

    async onMsg({ msg }, { steamId64, status }) {
        await this.ihlManager[CONSTANTS.EVENT_BOT_SET_STATUS](steamId64, status);
        return msg.say(`Bot ${steamId64} status set to ${status}`);
    }
};
