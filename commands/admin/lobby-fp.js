const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const Dota2 = require('dota2');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyFirstPickCommand
 * @category Commands
 * @extends IHLCommand
 * @memberof module:ihlCommand
 */
module.exports = class LobbyFirstPickCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-fp',
            group: 'admin',
            memberName: 'lobby-fp',
            guildOnly: true,
            description: 'Set lobby first pick.',
            examples: ['lobby-fp radiant', 'lobby-fp dire'],
            args: [
                {
                    key: 'side',
                    prompt: 'Provide a side (radiant/dire/random).',
                    type: 'string',
                    validate: (side) => {
                        if (side === 'radiant' || side === 'dire' || side === 'random') return true;
                        return 'Value must be radiant, dire, or random';
                    },
                },
            ],
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, lobbyState }, { side }) {
        let cmPick = Dota2.schema.DOTA_CM_PICK.DOTA_CM_RANDOM;
        let name = 'random';
        if (side === 'radiant') {
            cmPick = Dota2.schema.DOTA_CM_PICK.DOTA_CM_GOOD_GUYS;
            name = 'Radiant';
        }
        else if (side === 'dire') {
            cmPick = Dota2.schema.DOTA_CM_PICK.DOTA_CM_BAD_GUYS;
            name = 'Dire';
        }
        const result = await this.ihlManager[CONSTANTS.EVENT_LOBBY_SET_FP](lobbyState, cmPick);
        return msg.say(result ? `First pick set to ${name}.` : 'Failed to set first pick.');
    }
};
