const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class CommendCommand
 * @extends IHLCommand
 */
module.exports = class CommendCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'commend',
            group: 'ihl',
            memberName: 'commend',
            guildOnly: true,
            description: 'Commend a player after a game.',
            examples: ['commend @Ari*', 'commend Sasquatch'],
            args: [
                {
                    key: 'member',
                    prompt: 'Provide a player name or mention.',
                    type: 'string',
                },
            ],
        }, {
            lobbyState: false,
        });
    }

    async onMsg({ msg }, { member }) {

    }
};
