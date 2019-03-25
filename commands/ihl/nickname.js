const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class NicknameCommand
 * @extends IHLCommand
 */
module.exports = class NicknameCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'nickname',
            group: 'ihl',
            memberName: 'nickname',
            guildOnly: true,
            description: 'Set your nickname.',
            examples: ['nickname Arteezy'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide a nickname.',
                    type: 'string',
                },
            ],
        }, {
            lobbyState: false,
            inhouseUserVouched: false,
        });
    }

    async onMsg({ msg, inhouseUser }, { text }) {
        const values = { nickname: text };
        await inhouseUser.update(values);
        logger.debug(`User ${inhouseUser.discord_id} nickname set to ${text}.`);
        await msg.say(`Nickname set to ${text}`);
    }
};
