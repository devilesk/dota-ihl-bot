const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const dota2 = require('dota2');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyFirstPickCommand
 * @extends external:Command
 */
module.exports = class LobbyFirstPickCommand extends Command {
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
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { side }) {
        const cm_pick = side == 'radiant' ? dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_GOOD_GUYS
            : (side == 'dire' ? dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_BAD_GUYS : dota2.schema.lookupEnum('DOTA_CM_PICK').values.DOTA_CM_RANDOM);

        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        if (lobbyState) {
            ihlManager.emit(CONSTANTS.EVENT_LOBBY_SET_FP, lobbyState, cm_pick);
            await msg.say(`First pick ${cm_pick}.`).catch(console.error);
        }
        else {
            await msg.say('Not in a lobby channel.').catch(console.error);
        }
    }
};
