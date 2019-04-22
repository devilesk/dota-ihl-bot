const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class NicknameCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
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
        logger.silly(`User ${inhouseUser.discordId} nickname set to ${text}.`);
        return msg.say(`${msg.member.displayName} nickname set to ${text}.`);
    }
};
