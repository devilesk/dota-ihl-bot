const { Command } = require('discord.js-commando');
const {
    ihlManager, getLobbyFromMessage, isMessageFromAdmin,
} = require('../../lib/ihlManager');
const dota2 = require('dota2');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyGameModeCommand
 * @extends external:Command
 */
module.exports = class LobbyGameModeCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'lobby-gamemode',
            group: 'admin',
            memberName: 'lobby-gamemode',
            guildOnly: true,
            description: 'Set lobby game mode.',
            examples: ['lobby-gamemode cm', 'lobby-gamemode cd', 'lobby-gamemode ap'],
            args: [
                {
                    key: 'mode',
                    prompt: 'Provide a game mode (cm/cd/ap).',
                    type: 'string',
                    validate: (mode) => {
                        if (mode === 'cm' || mode === 'cd' || mode === 'ap') return true;
                        return 'Value must be cm, cd, or ap';
                    },
                },
            ],
        });
    }

    hasPermission(msg) {
        return isMessageFromAdmin(ihlManager.inhouseStates, msg);
    }

    async run(msg, { mode }) {
        const game_mode = mode == 'cm' ? dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_CM
            : (mode == 'cd' ? dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_CD : dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_AP);

        const [lobbyState] = getLobbyFromMessage(ihlManager.inhouseStates, msg);
        if (lobbyState) {
            ihlManager.emit(CONSTANTS.EVENT_LOBBY_SET_GAMEMODE, lobbyState, game_mode);
            msg.say(`Game mode ${game_mode}.`).catch(console.error);
        }
        else {
            msg.say('Not in a lobby channel.').catch(console.error);
        }
    }
};
