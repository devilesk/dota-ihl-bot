const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const dota2 = require('dota2');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyGameModeCommand
 * @extends IHLCommand
 */
module.exports = class LobbyGameModeCommand extends IHLCommand {
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
        }, {
            inhouseAdmin: true,
            inhouseState: true,
            lobbyState: true,
            inhouseUser: false,
        });
    }

    async onMsg({ msg, lobbyState }, { mode }) {
        const game_mode = mode === 'cm' ? dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_CM
            : (mode === 'cd' ? dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_CD : dota2.schema.lookupEnum('DOTA_GameMode').values.DOTA_GAMEMODE_AP);

        await this.ihlManager[CONSTANTS.EVENT_LOBBY_SET_GAMEMODE](lobbyState, game_mode);
        await msg.say(`Game mode ${game_mode}.`).catch(logger.error);
    }
};
