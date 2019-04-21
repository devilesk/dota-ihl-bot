const logger = require('../../lib/logger');
const IHLCommand = require('../../lib/ihlCommand');
const CONSTANTS = require('../../lib/constants');

/**
 * @class LobbyStateCommand
 * @extends IHLCommand
 */
module.exports = class LobbyStateCommand extends IHLCommand {
    constructor(client) {
        super(client, {
            name: 'lobby-state',
            group: 'admin',
            memberName: 'lobby-state',
            guildOnly: true,
            description: 'Manually set a lobby state and run it.',
            examples: ['lobby-state STATE_WAITING_FOR_QUEUE', 'lobby-state STATE_FAILED', 'lobby-state STATE_COMPLETED'],
            args: [
                {
                    key: 'state',
                    prompt: 'Provide a state.',
                    type: 'string',
                    validate: (state) => {
                        if (state.startsWith('STATE_') && Object.prototype.hasOwnProperty.call(CONSTANTS, state)) return true;
                        return 'Value must be a valid state';
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

    async onMsg({ msg, lobbyState }, { state }) {
        logger.silly(`LobbyStateCommand ${lobbyState}`);
        const oldState = lobbyState.state;
        await msg.say('Updating lobby state...');
        await this.ihlManager[CONSTANTS.EVENT_LOBBY_SET_STATE](lobbyState, state);
        return msg.say(`Lobby ${lobbyState.lobby_name} state from ${oldState} to ${state}.`);
    }
};
