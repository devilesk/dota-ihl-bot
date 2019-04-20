const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class InviteUrlCommand
 * @extends IHLCommand
 */
module.exports = class InviteUrlCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'invite-url',
            aliases: ['invite-link', 'bot-invite', 'invite-bot'],
            group: 'owner',
            memberName: 'invite-url',
            guildOnly: true,
            description: `Get the discord invite link to add the bot to your server.`,
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }) {
        await msg.say(this.ihlManager.inviteUrl);
    }
};
