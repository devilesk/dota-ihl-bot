const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class RestartCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class RestartCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'restart',
            group: 'owner',
            memberName: 'restart',
            guildOnly: true,
            description: 'Restart the bot.',
        }, {
            clientOwner: true,
            inhouseAdmin: false,
            inhouseState: false,
            lobbyState: false,
            inhouseUser: false,
        });
    }

    async onMsg({ msg }) {
        await msg.say('Restarting...');
        this.ihlManager.queueEvent(() => process.exit(0), []);
    }
};
