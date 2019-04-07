const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const dota2 = require('dota2');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyFirstPickCommand
 * @extends IHLCommand
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
        const cm_pick = side === 'radiant' ? dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_GOOD_GUYS
            : (side === 'dire' ? dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_BAD_GUYS : dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_RANDOM);

        this.ihlManager.emit(CONSTANTS.EVENT_LOBBY_SET_FP, lobbyState, cm_pick);
        await msg.say(`First pick ${cm_pick}.`).catch(console.error);
    }
};
