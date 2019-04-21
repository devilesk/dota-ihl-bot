const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');

/**
 * @class RolesCommand
 * @extends IHLCommand
 */
module.exports = class RolesCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'roles',
            group: 'ihl',
            memberName: 'roles',
            guildOnly: true,
            description: 'Set your dota role (positions 1-5) preference.',
            examples: ['roles 5', 'roles 5,2', 'roles 3,4,1'],
            args: [
                {
                    key: 'text',
                    prompt: 'Provide a comma-separated list of role numbers 1 to 5.',
                    type: 'string',
                },
            ],
        }, {
            lobbyState: false,
            inhouseUserVouched: false,
        });
    }

    async onMsg({ msg, inhouseUser }, { text }) {
        const values = {};
        // eslint-disable-next-line no-restricted-globals
        let roles = text.split(',').map(x => parseInt(x)).filter(x => !isNaN(x) && x >= 1 && x <= 5);
        roles = roles.filter((x, pos) => roles.indexOf(x) === pos);
        for (let i = 1; i <= 5; i++) {
            values[`role_${i}`] = roles.indexOf(i);
        }
        if (roles.length) {
            await inhouseUser.update(values);
            return msg.say(`Roles set to ${roles.join(',')}`);
        }
        return msg.say('No valid roles specified.');
    }
};
