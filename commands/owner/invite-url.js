const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const IHLManager = require('../../lib/ihlManager');

/**
 * @class InviteUrlCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class InviteUrlCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'invite-url',
            aliases: ['invite-link', 'bot-invite', 'invite-bot'],
            group: 'owner',
            memberName: 'invite-url',
            description: 'Get the discord invite link to add the bot to your server.',
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }) {
        logger.silly('InviteUrlCommand');
        return msg.say(IHLManager.IHLManager.inviteUrl);
    }
};
